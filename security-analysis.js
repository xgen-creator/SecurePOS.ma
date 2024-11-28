// securityAnalysisService.js
const cv = require('opencv4nodejs');
const tf = require('@tensorflow/tfjs-node');

class SecurityAnalysisService {
  constructor() {
    this.motionDetector = new MotionDetector();
    this.objectDetector = null;
    this.faceDetector = null;
    this.initializeDetectors();
  }

  async initializeDetectors() {
    // Charger les modèles
    this.objectDetector = await tf.loadGraphModel(
      'file://models/object_detection/model.json'
    );
    
    this.faceDetector = await tf.loadGraphModel(
      'file://models/face_detection/model.json'
    );
  }

  async analyzeFrame(frame, options = {}) {
    const results = {
      motionDetected: false,
      objects: [],
      faces: 0,
      suspicious: false
    };

    // Détection de mouvement
    if (options.detectMotion) {
      results.motionDetected = await this.motionDetector.detect(frame);
    }

    // Détection d'objets
    if (options.detectObjects) {
      results.objects = await this.detectObjects(frame);
    }

    // Détection de visages
    if (options.detectFaces) {
      results.faces = await this.detectFaces(frame);
    }

    // Analyse des comportements suspects
    if (options.analyzeBehavior) {
      results.suspicious = await this.analyzeBehavior(frame, results);
    }

    return results;
  }

  async detectObjects(frame) {
    const tensor = tf.browser.fromPix