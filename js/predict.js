const CLASSES =  ({0:'😠 angry',1:'😬 disgust',2:'😨 fear',3:'😄 happy', 4:'😢 sad',5:'😮 surprise',6:'😐 neutral'})
const COLORS =  ({0:'red',1:'green',2:'purple',3:'yellow', 4:'blue',5:'skyblue',6:'white'})

let originalVideoWidth=640;

let model;
let emotion= [6,CLASSES[6],1.000000];
let emotionColor;

var tracker = new tracking.LandmarksTracker();

Vue.component('monitor-canvas', {
  template: '<canvas id="faceCanvas" width="320" height="240" ></canvas>',
})
Vue.component('monitor-video', {
  template: '<video width="320" height="240" id="monitor-video" loop preload playsinline autoplay></video>',
})

new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  data() {
    return {
      model: null,
      debug_message: 'hello.please load model.'
    }
  },
  methods: {
    start: function() {
      this.startWebcam();
      this.alignment();
    },
    startWebcam() {
      var $video = this.$refs.monitor.$el
      tracker.setInitialScale(4);
      tracker.setStepSize(2);
      tracker.setEdgesDensity(0.1);
      $video.play()
      tracking.track($video, tracker, { camera: true });
    },
    alignment() {
      tracker.on('track', (event)=> {
        var canvas = this.$refs.canvas.$el;
        var context = canvas.getContext('2d');

        context.clearRect(0,0, canvas.width, canvas.height);
        if(!event.data) return;
        event.data.faces.forEach((rect)=> {
          this.predict(rect);
          console.log(emotion[0],emotion[1],emotion[2]);

          emotionColor = COLORS[emotion[0]]

          context.strokeStyle = emotionColor;
          context.lineWidth = 2;
          context.strokeRect(rect.x, rect.y, rect.width, rect.height);
          context.font = '11px Helvetica';
          context.fillStyle = emotionColor;
          context.fillText(emotion[1], rect.x + rect.width + 5, rect.y + 11);
          context.fillText(emotion[2].toFixed(6), rect.x + rect.width + 5, rect.y + 22);

        });
        event.data.landmarks.forEach(function(landmarks) {
          for(var l in landmarks){
            context.beginPath();
            context.fillStyle = emotionColor;
            context.arc(landmarks[l][0],landmarks[l][1],2,0,2*Math.PI);
            context.fill();
          }
        });
      });
    },
    preprocessImage(image){
      const channels = 1;
      let tensor = tf.fromPixels(image, channels).resizeNearestNeighbor([64,64]).toFloat();
      let offset = tf.scalar(255);
      return tensor.div(offset).expandDims();
    },
    captureWebcam: function(rect) {
      console.log(this.$refs)
      var faceCanvas = this.$refs.faceCanvas;
      var faceContext = faceCanvas.getContext('2d');
      var video = this.$refs.monitor.$el

      var adjust = originalVideoWidth / video.width
      faceContext.drawImage(video, rect.x * adjust , rect.y * adjust, rect.width * adjust, rect.height * adjust,0, 0, 100, 100);

      tensor_image = this.preprocessImage(faceCanvas);

      return tensor_image;
    },
    async predict(rect){
      let tensor = this.captureWebcam(rect) ;

      let prediction = await this.model.predict(tensor).data();
      let results = Array.from(prediction)
                  .map(function(p,i){
      return {
          probability: p,
          className: CLASSES[i],
          classNumber: i
      };
      }).sort(function(a,b){
          return b.probability-a.probability;
      }).slice(0,6);
      //   $("#console").empty();
      results.forEach((p)=>{
        // $("#console").append(`<li>${p.className} : ${p.probability.toFixed(6)}</li>`);
        console.log(`<li>${p.className} : ${p.probability.toFixed(6)}</li>`)
        this.debug_message = `${p.className} : ${p.probability.toFixed(6)}`
        return emotion = [results[0].classNumber,results[0].className, results[0].probability]
      });
    },
    async loadModel(){
      console.log("model loading..");
      this.debug_message = `model loading...`
      this.model = await tf.loadModel(`/emotion_XCEPTION/model.json`);
      this.debug_message = `XCEPTION model loaded.`
    }
  },
  mounted() {
    this.loadModel();
  },
})
