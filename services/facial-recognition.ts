import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import { Canvas, Image } from 'canvas';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

// Load custom types
interface FaceMatch {
  label: string;
  distance: number;
  detection: faceapi.FaceDetection;
  descriptor: Float32Array;
}

interface RecognitionResult {
  matches: FaceMatch[];
  timestamp: Date;
  processingTime: number;
  confidence: number;
}

export class FacialRecognitionService {
  private static modelPath = path.join(process.cwd(), 'models');
  private static labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;

    // Register canvas
    const canvas = createCanvas(1, 1);
    const context = canvas.getContext('2d');
    
    // Load all required models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath),
      faceapi.nets.faceExpressionNet.loadFromDisk(this.modelPath)
    ]);

    // Load labeled face descriptors
    await this.loadLabeledImages();
    
    this.isInitialized = true;
  }

  static async loadLabeledImages() {
    const labeledImagesPath = path.join(process.cwd(), 'data', 'labeled_faces');
    const labels = fs.readdirSync(labeledImagesPath);

    for (const label of labels) {
      const descriptions: Float32Array[] = [];
      const personPath = path.join(labeledImagesPath, label);
      const images = fs.readdirSync(personPath);

      for (const image of images) {
        const img = await loadImage(path.join(personPath, image));
        const detection = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          descriptions.push(detection.descriptor);
        }
      }

      if (descriptions.length > 0) {
        this.labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(label, descriptions)
        );
      }
    }
  }

  static async detectFaces(imageBuffer: Buffer): Promise<faceapi.FaceDetection[]> {
    await this.initialize();

    const img = await loadImage(imageBuffer);
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceExpressions();

    return detections;
  }

  static async recognizeFace(imageBuffer: Buffer): Promise<RecognitionResult> {
    const startTime = Date.now();
    await this.initialize();

    const img = await loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        matches: [],
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        confidence: 0
      };
    }

    const faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.6);
    const match = faceMatcher.findBestMatch(detection.descriptor);

    return {
      matches: [{
        label: match.label,
        distance: match.distance,
        detection: detection,
        descriptor: detection.descriptor
      }],
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
      confidence: 1 - match.distance
    };
  }

  static async addNewFace(
    imageBuffer: Buffer,
    label: string
  ): Promise<boolean> {
    await this.initialize();

    try {
      const img = await loadImage(imageBuffer);
      const detection = await faceapi.detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected in the image');
      }

      // Save the image and update labeled descriptors
      const labelPath = path.join(process.cwd(), 'data', 'labeled_faces', label);
      if (!fs.existsSync(labelPath)) {
        fs.mkdirSync(labelPath, { recursive: true });
      }

      const timestamp = Date.now();
      const imagePath = path.join(labelPath, `${timestamp}.jpg`);
      fs.writeFileSync(imagePath, imageBuffer);

      // Update labeled descriptors
      const existingLabel = this.labeledDescriptors.find(d => d.label === label);
      if (existingLabel) {
        existingLabel.descriptors.push(detection.descriptor);
      } else {
        this.labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(label, [detection.descriptor])
        );
      }

      return true;
    } catch (error) {
      console.error('Error adding new face:', error);
      return false;
    }
  }

  static async updateFaceDescriptors(
    label: string,
    imageBuffers: Buffer[]
  ): Promise<boolean> {
    await this.initialize();

    try {
      const descriptors: Float32Array[] = [];

      for (const buffer of imageBuffers) {
        const img = await loadImage(buffer);
        const detection = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          descriptors.push(detection.descriptor);
        }
      }

      if (descriptors.length === 0) {
        throw new Error('No valid face descriptors generated');
      }

      // Update or add new labeled descriptors
      const existingIndex = this.labeledDescriptors.findIndex(d => d.label === label);
      if (existingIndex >= 0) {
        this.labeledDescriptors[existingIndex] = new faceapi.LabeledFaceDescriptors(
          label,
          descriptors
        );
      } else {
        this.labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(label, descriptors)
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating face descriptors:', error);
      return false;
    }
  }

  static async compareFaces(
    image1Buffer: Buffer,
    image2Buffer: Buffer
  ): Promise<number> {
    await this.initialize();

    const img1 = await loadImage(image1Buffer);
    const img2 = await loadImage(image2Buffer);

    const detection1 = await faceapi.detectSingleFace(img1)
      .withFaceLandmarks()
      .withFaceDescriptor();

    const detection2 = await faceapi.detectSingleFace(img2)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection1 || !detection2) {
      throw new Error('Could not detect faces in one or both images');
    }

    const distance = faceapi.euclideanDistance(
      detection1.descriptor,
      detection2.descriptor
    );

    return 1 - distance; // Convert distance to similarity score (0-1)
  }

  static async detectAnomalies(
    imageBuffer: Buffer
  ): Promise<{
    hasMask: boolean;
    hasGlasses: boolean;
    emotions: any;
    quality: number;
  }> {
    await this.initialize();

    const img = await loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detection) {
      throw new Error('No face detected');
    }

    // Analyze face landmarks for mask detection
    const landmarks = detection.landmarks;
    const hasMask = this.detectMask(landmarks);

    // Analyze face landmarks for glasses detection
    const hasGlasses = this.detectGlasses(landmarks);

    // Get face expressions
    const emotions = detection.expressions;

    // Calculate image quality score
    const quality = this.calculateImageQuality(img);

    return {
      hasMask,
      hasGlasses,
      emotions,
      quality
    };
  }

  private static detectMask(landmarks: any): boolean {
    // Implement mask detection logic using facial landmarks
    // This is a simplified example
    return false;
  }

  private static detectGlasses(landmarks: any): boolean {
    // Implement glasses detection logic using facial landmarks
    // This is a simplified example
    return false;
  }

  private static calculateImageQuality(image: any): number {
    // Implement image quality assessment
    // This is a simplified example
    return 0.8;
  }
}
