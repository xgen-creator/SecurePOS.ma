import * as faceapi from 'face-api.js';
import { Canvas, Image } from 'canvas';
import { config } from '../config';
import { eventService } from './EventService';
import { loggingService } from './LoggingService';
import * as path from 'path';
import * as fs from 'fs';

// Patch pour face-api.js avec node-canvas
const canvas = require('canvas');
// @ts-ignore
faceapi.env.monkeyPatch({ Canvas, Image });

export interface FaceDescriptor {
  descriptor: Float32Array;
  name: string;
  timestamp: Date;
}

export interface DetectedFace {
  name: string;
  confidence: number;
  expressions: {
    [key: string]: number;
  };
  age: number;
  gender: string;
  genderProbability: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class FaceRecognitionService {
  private static instance: FaceRecognitionService;
  private isInitialized: boolean = false;
  private labeledDescriptors: FaceDescriptor[] = [];
  private minConfidence: number;
  private modelPath: string;

  private constructor() {
    this.minConfidence = config.faceApi.minConfidence;
    this.modelPath = path.resolve(config.faceApi.modelPath);
  }

  public static getInstance(): FaceRecognitionService {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService();
    }
    return FaceRecognitionService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      loggingService.info('Initializing face recognition service...');

      // Charger les modèles
      await this.loadModels();

      // Charger les descripteurs existants
      await this.loadSavedDescriptors();

      this.isInitialized = true;
      loggingService.info('Face recognition service initialized successfully');
      eventService.emit('face-recognition-ready', {}, 'FaceRecognitionService');
    } catch (error) {
      loggingService.error('Failed to initialize face recognition service', error as Error);
      throw error;
    }
  }

  private async loadModels(): Promise<void> {
    try {
      await Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath),
        faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath),
        faceapi.nets.faceExpressionNet.loadFromDisk(this.modelPath),
        faceapi.nets.ageGenderNet.loadFromDisk(this.modelPath)
      ]);
      loggingService.info('Face recognition models loaded successfully');
    } catch (error) {
      loggingService.error('Failed to load face recognition models', error as Error);
      throw new Error('Failed to load face recognition models');
    }
  }

  private async loadSavedDescriptors(): Promise<void> {
    const descriptorsPath = path.join(this.modelPath, 'descriptors.json');
    
    try {
      if (fs.existsSync(descriptorsPath)) {
        const data = await fs.promises.readFile(descriptorsPath, 'utf-8');
        const savedDescriptors = JSON.parse(data);
        
        this.labeledDescriptors = savedDescriptors.map((desc: any) => ({
          ...desc,
          descriptor: new Float32Array(desc.descriptor),
          timestamp: new Date(desc.timestamp)
        }));

        loggingService.info(`Loaded ${this.labeledDescriptors.length} face descriptors`);
      }
    } catch (error) {
      loggingService.error('Failed to load saved face descriptors', error as Error);
      this.labeledDescriptors = [];
    }
  }

  private async saveDescriptors(): Promise<void> {
    const descriptorsPath = path.join(this.modelPath, 'descriptors.json');
    
    try {
      await fs.promises.writeFile(
        descriptorsPath,
        JSON.stringify(this.labeledDescriptors, (key, value) => {
          if (value instanceof Float32Array) {
            return Array.from(value);
          }
          return value;
        }, 2)
      );
      loggingService.info('Face descriptors saved successfully');
    } catch (error) {
      loggingService.error('Failed to save face descriptors', error as Error);
    }
  }

  public async detectFace(imageBuffer: Buffer): Promise<DetectedFace[]> {
    if (!this.isInitialized) {
      throw new Error('Face recognition service not initialized');
    }

    try {
      // Charger l'image
      const img = await canvas.loadImage(imageBuffer);

      // Détecter tous les visages dans l'image
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender();

      const results: DetectedFace[] = [];

      for (const detection of detections) {
        // Rechercher le visage le plus proche dans notre base
        const descriptor = detection.descriptor;
        let bestMatch = { name: 'unknown', distance: 1 };

        for (const labeled of this.labeledDescriptors) {
          const distance = faceapi.euclideanDistance(descriptor, labeled.descriptor);
          if (distance < bestMatch.distance && distance < this.minConfidence) {
            bestMatch = { name: labeled.name, distance };
          }
        }

        const result: DetectedFace = {
          name: bestMatch.name,
          confidence: 1 - bestMatch.distance,
          expressions: detection.expressions,
          age: Math.round(detection.age),
          gender: detection.gender,
          genderProbability: detection.genderProbability,
          boundingBox: detection.detection.box.toJSON()
        };

        results.push(result);

        // Émettre un événement pour chaque visage détecté
        eventService.emit('face-detected', result, 'FaceRecognitionService');
      }

      return results;
    } catch (error) {
      loggingService.error('Error detecting faces', error as Error);
      throw error;
    }
  }

  public async addFace(imageBuffer: Buffer, name: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Face recognition service not initialized');
    }

    try {
      const img = await canvas.loadImage(imageBuffer);
      
      // Détecter le visage et obtenir son descripteur
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected in the image');
      }

      // Ajouter le nouveau descripteur
      this.labeledDescriptors.push({
        descriptor: detection.descriptor,
        name,
        timestamp: new Date()
      });

      // Sauvegarder les descripteurs mis à jour
      await this.saveDescriptors();

      eventService.emit('face-added', { name }, 'FaceRecognitionService');
      loggingService.info(`New face added: ${name}`);
    } catch (error) {
      loggingService.error('Error adding face', error as Error);
      throw error;
    }
  }

  public async removeFace(name: string): Promise<void> {
    this.labeledDescriptors = this.labeledDescriptors.filter(desc => desc.name !== name);
    await this.saveDescriptors();
    
    eventService.emit('face-removed', { name }, 'FaceRecognitionService');
    loggingService.info(`Face removed: ${name}`);
  }

  public async updateFace(imageBuffer: Buffer, name: string): Promise<void> {
    // Supprimer l'ancien descripteur
    await this.removeFace(name);
    // Ajouter le nouveau
    await this.addFace(imageBuffer, name);
    
    eventService.emit('face-updated', { name }, 'FaceRecognitionService');
    loggingService.info(`Face updated: ${name}`);
  }

  public getKnownFaces(): string[] {
    return [...new Set(this.labeledDescriptors.map(desc => desc.name))];
  }

  public async clearAllFaces(): Promise<void> {
    this.labeledDescriptors = [];
    await this.saveDescriptors();
    
    eventService.emit('faces-cleared', {}, 'FaceRecognitionService');
    loggingService.info('All faces cleared from database');
  }
}

export const faceRecognitionService = FaceRecognitionService.getInstance();
