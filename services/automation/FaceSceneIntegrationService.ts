import { EventEmitter } from 'events';
import SceneActionService from './SceneActionService';
import FaceRecognitionService, { FaceProfile } from '../recognition/FaceRecognitionService';
import { NotificationService } from '../notifications/NotificationService';

interface ProfileSceneMapping {
  profileId: string;
  scenes: {
    onPresence: string[];
    onAbsence: string[];
  };
}

export class FaceSceneIntegrationService {
  private static instance: FaceSceneIntegrationService;
  private mappings: Map<string, ProfileSceneMapping>;
  private eventEmitter: EventEmitter;
  private sceneService: typeof SceneActionService;
  private faceService: FaceRecognitionService;
  private notificationService: NotificationService;

  private constructor() {
    this.mappings = new Map();
    this.eventEmitter = new EventEmitter();
    this.sceneService = SceneActionService;
    this.faceService = FaceRecognitionService.getInstance();
    this.notificationService = NotificationService.getInstance();

    this.initializeEventListeners();
  }

  public static getInstance(): FaceSceneIntegrationService {
    if (!FaceSceneIntegrationService.instance) {
      FaceSceneIntegrationService.instance = new FaceSceneIntegrationService();
    }
    return FaceSceneIntegrationService.instance;
  }

  private initializeEventListeners() {
    // Écouter les événements de présence/absence des profils
    this.faceService.on('profilePresenceDetected', this.handleProfilePresence.bind(this));
    this.faceService.on('profileAbsenceDetected', this.handleProfileAbsence.bind(this));
  }

  public async setProfileScenes(
    profileId: string,
    scenes: {
      onPresence: string[];
      onAbsence: string[];
    }
  ) {
    const profile = this.faceService.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Valider l'existence des scènes
    for (const sceneId of [...scenes.onPresence, ...scenes.onAbsence]) {
      if (!this.sceneService.getScene(sceneId)) {
        throw new Error(`Scene not found: ${sceneId}`);
      }
    }

    this.mappings.set(profileId, {
      profileId,
      scenes
    });

    this.eventEmitter.emit('profileScenesUpdated', { profileId, scenes });

    // Mettre à jour le profil avec les nouvelles scènes
    await this.faceService.updateProfile(profileId, {
      scenes: scenes.onPresence
    });
  }

  public getProfileScenes(profileId: string): ProfileSceneMapping | undefined {
    return this.mappings.get(profileId);
  }

  private async handleProfilePresence(profile: FaceProfile) {
    const mapping = this.mappings.get(profile.id);
    if (!mapping) return;

    try {
      // Activer les scènes associées à la présence
      for (const sceneId of mapping.scenes.onPresence) {
        await this.sceneService.activateScene(sceneId);
      }

      this.notificationService.send({
        title: 'Scènes activées',
        message: `Les scènes associées à ${profile.name} ont été activées`,
        type: 'info',
        source: 'faceSceneIntegration'
      });

      this.eventEmitter.emit('profileScenesActivated', {
        profileId: profile.id,
        scenes: mapping.scenes.onPresence
      });
    } catch (error) {
      console.error('Error activating presence scenes:', error);
      this.notificationService.send({
        title: 'Erreur d\'activation',
        message: `Impossible d'activer les scènes pour ${profile.name}`,
        type: 'error',
        source: 'faceSceneIntegration'
      });
    }
  }

  private async handleProfileAbsence(profile: FaceProfile) {
    const mapping = this.mappings.get(profile.id);
    if (!mapping) return;

    try {
      // Désactiver les scènes de présence
      for (const sceneId of mapping.scenes.onPresence) {
        await this.sceneService.deactivateScene(sceneId);
      }

      // Activer les scènes d'absence
      for (const sceneId of mapping.scenes.onAbsence) {
        await this.sceneService.activateScene(sceneId);
      }

      this.notificationService.send({
        title: 'Scènes mises à jour',
        message: `Les scènes d'absence pour ${profile.name} ont été activées`,
        type: 'info',
        source: 'faceSceneIntegration'
      });

      this.eventEmitter.emit('profileScenesDeactivated', {
        profileId: profile.id,
        scenes: mapping.scenes.onAbsence
      });
    } catch (error) {
      console.error('Error handling absence scenes:', error);
      this.notificationService.send({
        title: 'Erreur de mise à jour',
        message: `Impossible de mettre à jour les scènes pour ${profile.name}`,
        type: 'error',
        source: 'faceSceneIntegration'
      });
    }
  }

  public on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }
}

export default FaceSceneIntegrationService.getInstance();
