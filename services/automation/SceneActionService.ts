import { DeviceManager } from '../devices/DeviceManager';
import { EventEmitter } from 'events';

export interface Scene {
  id: string;
  name: string;
  description?: string;
  deviceStates: Array<{
    deviceId: string;
    state: any;
    transitionDuration?: number;
  }>;
  priority: number;
  tags?: string[];
}

export class SceneActionService {
  private static instance: SceneActionService;
  private scenes: Map<string, Scene>;
  private deviceManager: DeviceManager;
  private eventEmitter: EventEmitter;
  private activeScene: string | null;
  private sceneHistory: Array<{
    sceneId: string;
    timestamp: number;
    action: 'activate' | 'deactivate';
    success: boolean;
  }>;

  private constructor() {
    this.scenes = new Map();
    this.deviceManager = DeviceManager.getInstance();
    this.eventEmitter = new EventEmitter();
    this.activeScene = null;
    this.sceneHistory = [];

    // Scènes par défaut
    this.initializeDefaultScenes();
  }

  public static getInstance(): SceneActionService {
    if (!SceneActionService.instance) {
      SceneActionService.instance = new SceneActionService();
    }
    return SceneActionService.instance;
  }

  private initializeDefaultScenes() {
    const defaultScenes: Scene[] = [
      {
        id: 'night_mode',
        name: 'Mode Nuit',
        description: 'Configuration pour la nuit',
        deviceStates: [
          { deviceId: 'living_room_lights', state: { power: false } },
          { deviceId: 'bedroom_lights', state: { power: false } },
          { deviceId: 'security_system', state: { armed: true } },
          { deviceId: 'thermostat', state: { temperature: 19 } }
        ],
        priority: 1,
        tags: ['night', 'security']
      },
      {
        id: 'morning_mode',
        name: 'Mode Matin',
        description: 'Configuration pour le matin',
        deviceStates: [
          { deviceId: 'living_room_lights', state: { power: true, brightness: 80 } },
          { deviceId: 'kitchen_lights', state: { power: true, brightness: 100 } },
          { deviceId: 'thermostat', state: { temperature: 21 } }
        ],
        priority: 1,
        tags: ['morning', 'comfort']
      },
      {
        id: 'away_mode',
        name: 'Mode Absent',
        description: 'Configuration en cas d\'absence',
        deviceStates: [
          { deviceId: 'all_lights', state: { power: false } },
          { deviceId: 'security_system', state: { armed: true } },
          { deviceId: 'thermostat', state: { mode: 'eco' } },
          { deviceId: 'cameras', state: { recording: true } }
        ],
        priority: 2,
        tags: ['security', 'energy_saving']
      }
    ];

    defaultScenes.forEach(scene => this.addScene(scene));
  }

  public async activateScene(sceneId: string): Promise<boolean> {
    try {
      const scene = this.scenes.get(sceneId);
      if (!scene) {
        throw new Error(`Scène non trouvée: ${sceneId}`);
      }

      // Vérifier les conflits de priorité
      if (this.activeScene) {
        const activeScene = this.scenes.get(this.activeScene);
        if (activeScene && activeScene.priority > scene.priority) {
          throw new Error('Une scène de priorité supérieure est active');
        }
      }

      // Appliquer les états des appareils
      for (const deviceState of scene.deviceStates) {
        const device = this.deviceManager.getDevice(deviceState.deviceId);
        if (device) {
          if (deviceState.transitionDuration) {
            await device.setStateWithTransition(deviceState.state, deviceState.transitionDuration);
          } else {
            await device.setState(deviceState.state);
          }
        }
      }

      this.activeScene = sceneId;
      
      // Enregistrer dans l'historique
      this.sceneHistory.push({
        sceneId,
        timestamp: Date.now(),
        action: 'activate',
        success: true
      });

      // Limiter l'historique à 1000 entrées
      if (this.sceneHistory.length > 1000) {
        this.sceneHistory.shift();
      }

      this.eventEmitter.emit('sceneActivated', { sceneId, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'activation de la scène ${sceneId}:`, error);
      
      this.sceneHistory.push({
        sceneId,
        timestamp: Date.now(),
        action: 'activate',
        success: false
      });
      
      return false;
    }
  }

  public async deactivateScene(sceneId: string): Promise<boolean> {
    try {
      if (this.activeScene !== sceneId) {
        return false;
      }

      const scene = this.scenes.get(sceneId);
      if (!scene) {
        throw new Error(`Scène non trouvée: ${sceneId}`);
      }

      // Restaurer les états par défaut des appareils
      for (const deviceState of scene.deviceStates) {
        const device = this.deviceManager.getDevice(deviceState.deviceId);
        if (device) {
          await device.resetToDefault();
        }
      }

      this.activeScene = null;
      
      this.sceneHistory.push({
        sceneId,
        timestamp: Date.now(),
        action: 'deactivate',
        success: true
      });

      this.eventEmitter.emit('sceneDeactivated', { sceneId, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error(`Erreur lors de la désactivation de la scène ${sceneId}:`, error);
      
      this.sceneHistory.push({
        sceneId,
        timestamp: Date.now(),
        action: 'deactivate',
        success: false
      });
      
      return false;
    }
  }

  public addScene(scene: Scene) {
    this.scenes.set(scene.id, scene);
    this.eventEmitter.emit('sceneAdded', { sceneId: scene.id });
  }

  public removeScene(sceneId: string) {
    if (this.activeScene === sceneId) {
      this.deactivateScene(sceneId);
    }
    this.scenes.delete(sceneId);
    this.eventEmitter.emit('sceneRemoved', { sceneId });
  }

  public updateScene(scene: Scene) {
    const isActive = this.activeScene === scene.id;
    if (isActive) {
      this.deactivateScene(scene.id);
    }
    
    this.scenes.set(scene.id, scene);
    
    if (isActive) {
      this.activateScene(scene.id);
    }
    
    this.eventEmitter.emit('sceneUpdated', { sceneId: scene.id });
  }

  public getScene(sceneId: string): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  public getAllScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  public getActiveScene(): string | null {
    return this.activeScene;
  }

  public getSceneHistory(): typeof this.sceneHistory {
    return this.sceneHistory;
  }

  public on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }
}

export default SceneActionService.getInstance();
