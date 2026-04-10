import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
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

/**
 * Service d'intégration visage-scènes
 * @singleton Gère les mappings entre profils faciaux et scènes domotiques
 * @emits profileScenesUpdated, profileScenesActivated, profileScenesDeactivated
 */
export class FaceSceneIntegrationService {
  private static instance: FaceSceneIntegrationService;
  private static isDestroyed = false;
  private mappings: Map<string, ProfileSceneMapping>;
  private eventEmitter: EventEmitter;
  private sceneService: typeof SceneActionService;
  private faceService: FaceRecognitionService;
  private notificationService: NotificationService;
  private boundListeners: Map<string, (...args: any[]) => void>;

  private constructor() {
    this.mappings = new Map();
    this.eventEmitter = new EventEmitter();
    this.sceneService = SceneActionService;
    this.faceService = FaceRecognitionService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.boundListeners = new Map();

    this.initializeEventListeners();
    FaceSceneIntegrationService.isDestroyed = false;
  }

  public static getInstance(): FaceSceneIntegrationService {
    if (!FaceSceneIntegrationService.instance || FaceSceneIntegrationService.isDestroyed) {
      FaceSceneIntegrationService.instance = new FaceSceneIntegrationService();
    }
    return FaceSceneIntegrationService.instance;
  }

  /**
   * Destroys the service instance and cleans up all resources
   * Removes event listeners, clears mappings, and resets the singleton
   */
  public static destroy(): void {
    if (FaceSceneIntegrationService.isDestroyed) {
      logger.warn('FaceSceneIntegrationService already destroyed');
      return;
    }

    const instance = FaceSceneIntegrationService.instance;
    if (instance) {
      // Remove all bound listeners from faceService
      instance.boundListeners.forEach((listener, event) => {
        instance.faceService.removeListener(event, listener);
        logger.debug(`Removed listener for event: ${event}`);
      });
      instance.boundListeners.clear();

      // Remove all listeners from internal eventEmitter
      instance.eventEmitter.removeAllListeners();

      // Clear mappings
      instance.mappings.clear();

      logger.info('FaceSceneIntegrationService destroyed successfully');
    }

    FaceSceneIntegrationService.isDestroyed = true;
    FaceSceneIntegrationService.instance = null as any;
  }

  private initializeEventListeners() {
    // Écouter les événements de présence/absence des profils
    const presenceHandler = this.handleProfilePresence.bind(this);
    const absenceHandler = this.handleProfileAbsence.bind(this);

    this.faceService.on('profilePresenceDetected', presenceHandler);
    this.faceService.on('profileAbsenceDetected', absenceHandler);

    // Store bound listeners for cleanup
    this.boundListeners.set('profilePresenceDetected', presenceHandler);
    this.boundListeners.set('profileAbsenceDetected', absenceHandler);
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
      logger.error('Error activating presence scenes', { error: error instanceof Error ? error.message : 'Unknown', profile: profile.name });
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
      logger.error('Error handling absence scenes', { error: error instanceof Error ? error.message : 'Unknown', profile: profile.name });
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
