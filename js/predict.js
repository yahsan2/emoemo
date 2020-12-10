const CLASSES =  {0:'angry',1:'disgust',2:'fear',3:'happy',4:'sad',5:'surprise',6:'neutral'}
const EMOJIS =  {0:'😠',1:'😬',2:'😨',3:'😄',4:'😢',5:'😮',6:'😐'}
const COLORS =  {0:'red',1:'green',2:'purple',3:'yellow', 4:'blue',5:'skyblue',6:'white'}

const originalVideoWidth=640;
const tracker = new tracking.LandmarksTracker();

const firestore = firebase.firestore();

Vue.component('monitor-canvas', {
  template: '<canvas width="320" height="240" ></canvas>',
})
Vue.component('monitor-video', {
  template: '<video width="320" height="240" id="monitor-video" loop preload playsinline autoplay></video>',
})

new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  data() {
    return {
      posts: [],
      targetEmotion: 'happy',
      valid: false,
      post: {
        text: "",
        name: ""
      },
      postRules: [
        v => !!v || 'Name is required',
        v => v.length <= 10 || 'Name must be less than 10 characters',
      ],
      model: null,
      results: [],
      debug_message: 'hello.please load model.',
      avatarStyleOptions: {
        topType: [
          "NoHair",
          "Eyepatch",
          "Hat",
          "Hijab",
          "Turban",
          "WinterHat1",
          "WinterHat2",
          "WinterHat3",
          "WinterHat4",
          "LongHairBigHair",
          "LongHairBob",
          "LongHairBun",
          "LongHairCurly",
          "LongHairCurvy",
          "LongHairDreads",
          "LongHairFrida",
          "LongHairFro",
          "LongHairFroBand",
          "LongHairNotTooLong",
          "LongHairShavedSides",
          "LongHairMiaWallace",
          "LongHairStraight",
          "LongHairStraight2",
          "LongHairStraightStrand",
          "ShortHairDreads01",
          "ShortHairDreads02",
          "ShortHairFrizzle",
          "ShortHairShaggyMullet",
          "ShortHairShortCurly",
          "ShortHairShortFlat",
          "ShortHairShortRound",
          "ShortHairShortWaved",
          "ShortHairSides",
          "ShortHairTheCaesar",
          "ShortHairTheCaesarSidePart",
        ],
        facialHairType: [
          "Blank",
          "BeardMedium",
          "BeardLight",
          "BeardMagestic",
          "MoustacheFancy",
          "MoustacheMagnum",
        ],
        hairColor: [
          "Blank",
          "Kurt",
          "Prescription01",
          "Prescription02",
          "Round",
          "Sunglasses",
          "Wayfarers",
        ],
        accessoriesType: [
          "Blank",
          "Kurt",
          "Prescription01",
          "Prescription02",
          "Round",
          "Sunglasses",
          "Wayfarers",
        ],
        clotheType: [
          "BlazerShirt",
          "BlazerSweater",
          "CollarSweater",
          "GraphicShirt",
          "Hoodie",
          "Overall",
          "ShirtCrewNeck",
          "ShirtScoopNeck",
          "ShirtVNeck",
        ],
        clotheColor: [
          "Black",
          "Blue01",
          "Blue02",
          "Blue03",
          "Gray01",
          "Gray02",
          "Heather",
          "PastelBlue",
          "PastelGreen",
          "PastelOrange",
          "PastelRed",
          "PastelYellow",
          "Pink",
          "Red",
          "White",
        ],
        eyeType: [
          "Close",
          "Cry",
          "Default",
          "Dizzy",
          "EyeRoll",
          "Happy",
          "Hearts",
          "Side",
          "Squint",
          "Surprised",
          "Wink",
          "WinkWacky",
        ],
        eyebrowType: [
          "Angry",
          "AngryNatural",
          "Default",
          "DefaultNatural",
          "FlatNatural",
          "RaisedExcited",
          "RaisedExcitedNatural",
          "SadConcerned",
          "SadConcernedNatural",
          "UnibrowNatural",
          "UpDown",
          "UpDownNatural",
        ],
        skinColor: [
          "Tanned",
          "Yellow",
          "Pale",
          "Light",
          "Brown",
          "DarkBrown",
          "Black",
        ]
      }
    }
  },
  computed: {
    happyIndex() {
      return this.results.findIndex(r => r.className === 'happy')
    },
    happyProbability() {
      return this.results.find(r => r.className === 'happy').probability
    },
    topEmotion() {
      return this.results[0] || {}
    },
    emotionNum() {
      return this.topEmotion.classNumber
    },
    emotionProbability() {
      return this.topEmotion.probability && this.topEmotion.probability.toFixed(6)
    },
    emotionEmoji(){
      return this.topEmotion.emoji
    },
    emotionClass(){
      return this.topEmotion.className
    },
    emotionColor(){
      return this.topEmotion.color
    }
  },
  methods: {
    start() {
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
      var canvas = this.$refs.canvas.$el;
      var context = canvas.getContext('2d');
      tracker.on('track', (event)=> {
        context.clearRect(0,0, canvas.width, canvas.height);
        if(!event.data) return;
        event.data.faces.forEach(async (rect)=> {
          let tensor = this.captureWebcam(rect) ;
          this.predict(tensor);
          context.strokeStyle = this.emotionColor;
          context.lineWidth = 2;
          context.strokeRect(rect.x, rect.y, rect.width, rect.height);
          context.font = '11px Helvetica';
          context.fillStyle = this.emotionColor;
          context.fillText(this.emotionClass, rect.x + rect.width + 5, rect.y + 11);
          context.fillText(this.emotionProbability, rect.x + rect.width + 5, rect.y + 22);
        });
        event.data.landmarks.forEach((landmarks)=> {
          for(let l in landmarks){
            context.beginPath();
            context.fillStyle = this.emotionColor;
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
    captureWebcam(rect) {
      var faceCanvas = this.$refs.faceCanvas;
      var faceContext = faceCanvas.getContext('2d');
      var video = this.$refs.monitor.$el
      var adjust = originalVideoWidth / video.width
      faceContext.drawImage(video, rect.x * adjust , rect.y * adjust, rect.width * adjust, rect.height * adjust,0, 0, 100, 100);

      tensor_image = this.preprocessImage(faceCanvas);
      return tensor_image;
    },
    async predict(tensor){
      let prediction = await this.model.predict(tensor).data();
      this.results = Array.from(prediction).map((p,i)=>{
        return {
            probability: p,
            color: COLORS[i],
            emoji: EMOJIS[i],
            className: CLASSES[i],
            classNumber: i
        };
      }).sort((a,b)=>{
          return b.probability - a.probability;
      }).slice(0,6);
    },
    async loadModel(){
      console.log("model loading..");
      this.debug_message = `model loading...`
      this.model = await tf.loadModel(`/emotion_XCEPTION/model.json`);
      this.debug_message = `XCEPTION model loaded.`
    },
    randomAvatar () {
      const topType = this.avatarStyleOptions.topType[Math.floor(Math.random() * this.avatarStyleOptions.topType.length)];
      const accessoriesType = this.avatarStyleOptions.accessoriesType[Math.floor(Math.random() * this.avatarStyleOptions.accessoriesType.length)];
      const hairColor = this.avatarStyleOptions.hairColor[Math.floor(Math.random() * this.avatarStyleOptions.hairColor.length)];
      const facialHairType = this.avatarStyleOptions.facialHairType[Math.floor(Math.random() * this.avatarStyleOptions.facialHairType.length)];
      const clotheType = this.avatarStyleOptions.clotheType[Math.floor(Math.random() * this.avatarStyleOptions.clotheType.length)];
      const clotheColor = this.avatarStyleOptions.clotheColor[Math.floor(Math.random() * this.avatarStyleOptions.clotheColor.length)];
      const eyeType = this.avatarStyleOptions.eyeType[Math.floor(Math.random() * this.avatarStyleOptions.eyeType.length)];
      const eyebrowType = this.avatarStyleOptions.eyebrowType[Math.floor(Math.random() * this.avatarStyleOptions.eyebrowType.length)];
      return `https://avataaars.io/?avatarStyle=transparent&topType=${topType}&accessoriesType=${accessoriesType}&hairColor=${hairColor}&facialHairType=${facialHairType}&clotheType=${clotheType}&clotheColor=${clotheColor}&eyeType=${eyeType}&eyebrowType=${eyebrowType}&mouthType=Default&skinColor=Light`
    },
    addPost() {
      if(!this.emotionClass) {
        return false
      }
      firestore.collection("emotions").doc(this.emotionClass).collection('posts').add({
        name: this.post.name,
        text: this.post.text
      })
      this.$set(this.post, 'name', '')
      this.$set(this.post, 'text', '')
    }
  },
  async mounted() {
    this.loadModel();
    const query = firestore.collection("emotions").doc(this.targetEmotion).collection('posts')

    query.onSnapshot(querySnapshot => {
      let changes = querySnapshot.docChanges();
      for (let change of changes) {
        if(change.type === 'added') {
          this.posts.push({
            id: change.doc.id,
            ...change.doc.data()
          })
        } else if (change.type === 'modified') {
          const index = this.posts.findIndex(post => post.id === change.doc.id)
          if (index !== -1) {
            this.posts[index] = {
              id: change.doc.id,
              ...change.doc.data()
            }
          }
        } else if (change.type === 'removed') {
          const index = this.posts.findIndex(post => post.id === change.doc.id)
          if (index !== -1) {
            this.posts.splice(index, 1)
          }
        }
        console.log(`A document was ${change.type}.`);
      }
    });
  },
})
