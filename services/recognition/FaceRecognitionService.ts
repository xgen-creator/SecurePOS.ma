import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '../storage/Storage';
import { EncryptionService } from '../encryption';
import { loadFaceApi, FaceApi } from '../utils/faceApiLoader';

// Type-only import for faceapi types
type FaceAPI = FaceApi;

export interface FaceProfile {
  id: string;
  name: string;
  descriptors: Float32Array[];
  thumbnail?: string;
  lastSeen?: Date;
  scenes?: string[];
  customActions?: {
    onPresence?: string[];
    onAbsence?: string[];
  };
}

// Interface pour le stockage chiffré (RGPD compliant)
interface EncryptedFaceProfile {
  id: string;
  name: string;
  // Descripteurs chiffrés - stockés comme string JSON encryptée
  encryptedDescriptors: string;
  thumbnail?: string;
  lastSeen?: string;
  scenes?: string[];
  customActions?: {
    onPresence?: string[];
    onAbsence?: string[];
  };
}

export interface DetectedFace {
  id?: string;
  name?: string;
  confidence: number;
  box: any; // faceapi.Box - will be typed after dynamic import
  landmarks: any; // faceapi.FaceLandmarks68
  descriptor: Float32Array;
  age?: number;
  gender?: string;
  expression?: {
    [key: string]: number;
  };
}

export interface RecognitionOptions {
  minConfidence?: number;
  maxDistance?: number;
  detectAge?: boolean;
  detectGender?: boolean;
  detectExpressions?: boolean;
  captureInterval?: number;
}

class FaceRecognitionService extends EventEmitter {
  private static instance: FaceRecognitionService;
  private profiles: Map<string, FaceProfile> = new Map();
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private options: RecognitionOptions = {
    minConfidence: 0.5,
    maxDistance: 0.6,
    detectAge: true,
    detectGender: true,
    detectExpressions: true,
    captureInterval: 1000
  };

  private constructor() {
    super();
    this.loadProfiles();
  }

  public static getInstance(): FaceRecognitionService {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService();
    }
    return FaceRecognitionService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      
      if (this.options.detectAge || this.options.detectGender) {
        await faceapi.nets.ageGenderNet.loadFromUri('/models');
      }
      
      if (this.options.detectExpressions) {
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', 'Failed to initialize face recognition models');
      throw error;
    }
  }

  public async detectFaces(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<DetectedFace[]> {
    if (!this.isInitialized) {
      throw new Error('Face recognition service not initialized');
    }

    if (this.isProcessing) {
      return [];
    }

    this.isProcessing = true;

    try {
      const detections = await faceapi
        .detectAllFaces(input, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const detectedFaces: DetectedFace[] = [];

      for (const detection of detections) {
        const face: DetectedFace = {
          box: detection.detection.box,
          landmarks: detection.landmarks,
          descriptor: detection.descriptor,
          confidence: detection.detection.score
        };

        // Recherche de correspondance avec les profils existants
        const match = await this.findBestMatch(detection.descriptor);
        if (match) {
          face.id = match.id;
          face.name = match.name;
        }

        // Détection de l'âge et du genre si activée
        if (this.options.detectAge || this.options.detectGender) {
          const ageGender = await faceapi
            .detectSingleFace(input)
            .withAgeAndGender();
          
          if (ageGender) {
            face.age = Math.round(ageGender.age);
            face.gender = ageGender.gender;
          }
        }

        // Détection des expressions si activée
        if (this.options.detectExpressions) {
          const expression = await faceapi
            .detectSingleFace(input)
            .withFaceExpressions();
          
          if (expression) {
            face.expression = expression.expressions;
          }
        }

        detectedFaces.push(face);
      }

      this.emit('facesDetected', detectedFaces);
      return detectedFaces;
    } catch (error) {
      this.emit('error', 'Face detection failed');
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  public async addProfile(
    name: string,
    descriptors: Float32Array[],
    thumbnail?: string
  ): Promise<FaceProfile> {
    const profile: FaceProfile = {
      id: uuidv4(),
      name,
      descriptors,
      thumbnail,
      scenes: [],
      customActions: {
        onPresence: [],
        onAbsence: []
      }
    };

    this.profiles.set(profile.id, profile);
    await this.saveProfiles();
    this.emit('profileAdded', profile);
    return profile;
  }

  public async updateProfile(
    id: string,
    updates: Partial<FaceProfile>
  ): Promise<FaceProfile | null> {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(id, updatedProfile);
    await this.saveProfiles();
    this.emit('profileUpdated', updatedProfile);
    return updatedProfile;
  }

  public async deleteProfile(id: string): Promise<boolean> {
    const deleted = this.profiles.delete(id);
    if (deleted) {
      await this.saveProfiles();
      this.emit('profileDeleted', id);
    }
    return deleted;
  }

  public getProfile(id: string): FaceProfile | null {
    return this.profiles.get(id) || null;
  }

  public getAllProfiles(): FaceProfile[] {
    return Array.from(this.profiles.values());
  }

  public updateOptions(options: Partial<RecognitionOptions>): void {
    this.options = { ...this.options, ...options };
    this.emit('optionsUpdated', this.options);
  }

  private async findBestMatch(
    descriptor: Float32Array
  ): Promise<FaceProfile | null> {
    let bestMatch: FaceProfile | null = null;
    let minDistance = this.options.maxDistance || Infinity;

    for (const profile of this.profiles.values()) {
      for (const knownDescriptor of profile.descriptors) {
        const distance = faceapi.euclideanDistance(descriptor, knownDescriptor);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = profile;
        }
      }
    }

    if (bestMatch) {
      bestMatch.lastSeen = new Date();
      await this.updateProfile(bestMatch.id, { lastSeen: bestMatch.lastSeen });
    }

    return bestMatch;
  }

  private async loadProfiles(): Promise<void> {
    try {
      const savedProfiles = await Storage.get('faceProfiles');
      if (savedProfiles) {
        const encryptedProfiles = Object.entries(savedProfiles) as [string, EncryptedFaceProfile][];
        
        // Déchiffrer les descripteurs pour chaque profil
        for (const [id, encryptedProfile] of encryptedProfiles) {
          try {
            const decryptedDescriptorsJson = await EncryptionService.decryptField(
              encryptedProfile.encryptedDescriptors
            );
            const descriptorsArray = JSON.parse(decryptedDescriptorsJson) as number[][];
            const descriptors = descriptorsArray.map(arr => new Float32Array(arr));
            
            const profile: FaceProfile = {
              id: encryptedProfile.id,
              name: encryptedProfile.name,
              descriptors,
              thumbnail: encryptedProfile.thumbnail,
              lastSeen: encryptedProfile.lastSeen ? new Date(encryptedProfile.lastSeen) : undefined,
              scenes: encryptedProfile.scenes,
              customActions: encryptedProfile.customActions
            };
            
            this.profiles.set(id, profile);
          } catch (decryptError) {
            this.emit('error', `Failed to decrypt profile ${id}: ${decryptError}`);
            // Continue with other profiles
          }
        }
      }
    } catch (error) {
      this.emit('error', 'Failed to load face profiles');
    }
  }

  private async saveProfiles(): Promise<void> {
    try {
      const encryptedProfiles: Record<string, EncryptedFaceProfile> = {};
      
      // Chiffrer les descripteurs pour chaque profil avant sauvegarde
      for (const [id, profile] of this.profiles.entries()) {
        try {
          // Convertir Float32Array[] en number[][] pour JSON serialization
          const descriptorsArray = profile.descriptors.map(desc => Array.from(desc));
          const descriptorsJson = JSON.stringify(descriptorsArray);
          
          // Chiffrer les descripteurs
          const encryptedDescriptors = await EncryptionService.encryptField(descriptorsJson);
          
          const encryptedProfile: EncryptedFaceProfile = {
            id: profile.id,
            name: profile.name,
            encryptedDescriptors,
            thumbnail: profile.thumbnail,
            lastSeen: profile.lastSeen?.toISOString(),
            scenes: profile.scenes,
            customActions: profile.customActions
          };
          
          encryptedProfiles[id] = encryptedProfile;
        } catch (encryptError) {
          this.emit('error', `Failed to encrypt profile ${id}: ${encryptError}`);
          // Skip this profile but continue with others
          continue;
        }
      }
      
      await Storage.set('faceProfiles', encryptedProfiles);
    } catch (error) {
      this.emit('error', 'Failed to save face profiles');
    }
  }
}

export default FaceRecognitionService;
