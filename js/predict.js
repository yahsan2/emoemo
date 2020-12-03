const CLASSES =  {0:'angry',1:'disgust',2:'fear',3:'happy',4:'sad',5:'surprise',6:'neutral'}
const EMOJIS =  {0:'😠',1:'😬',2:'😨',3:'😄',4:'😢',5:'😮',6:'😐'}
const COLORS =  {0:'red',1:'green',2:'purple',3:'yellow', 4:'blue',5:'skyblue',6:'white'}

const originalVideoWidth=640;
const tracker = new tracking.LandmarksTracker();

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
      emotionNum: 6,
      emotionProbability: 1.000000,
      debug_message: 'hello.please load model.'
    }
  },
  computed: {
    currentEmotionEmoji(){
      return EMOJIS[this.emotionNum]
    },
    currentEmotionClass(){
      console.log(this.emotionNum)
      console.log(CLASSES)

      return CLASSES[this.emotionNum]
    },
    currentEmotionColor(){
      return COLORS[this.emotionNum]
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
          console.log(this.currentEmotionClass)
          console.log(this.emotionNum, this.currentEmotionClass, this.emotionProbability);

          context.strokeStyle = this.currentEmotionColor;
          context.lineWidth = 2;
          context.strokeRect(rect.x, rect.y, rect.width, rect.height);
          context.font = '11px Helvetica';
          context.fillStyle = this.currentEmotionColor;
          context.fillText(this.currentEmotionClass, rect.x + rect.width + 5, rect.y + 11);
          context.fillText(this.emotionProbability.toFixed(6), rect.x + rect.width + 5, rect.y + 22);

        });
        event.data.landmarks.forEach((landmarks)=> {
          for(let l in landmarks){
            context.beginPath();
            context.fillStyle = this.currentEmotionColor;
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
      let results = Array.from(prediction).map((p,i)=>{
        return {
            probability: p,
            className: CLASSES[i],
            classNumber: i
        };
      }).sort((a,b)=>{
          return b.probability - a.probability;
      }).slice(0,6);
      results.forEach((p)=>{
        this.debug_message = `${p.className} : ${p.probability.toFixed(6)}`
        this.emotionNum = results[0].classNumber
        this.emotionProbability = results[0].probability
        // this.emotion = emotion = [results[0].classNumber,results[0].className, results[0].probability]
        // return emotion
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
