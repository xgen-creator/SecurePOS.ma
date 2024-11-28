import { Device } from '../../components/devices/types';
import { DeviceDiscoveryService } from '../devices/DeviceDiscoveryService';

export interface SceneAction {
  deviceId: string;
  state: Partial<Device>;
}

export interface Scene {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  actions: SceneAction[];
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export class SceneManager {
  private static instance: SceneManager;
  private scenes: Map<string, Scene> = new Map();
  private deviceService: DeviceDiscoveryService;

  private constructor() {
    this.deviceService = DeviceDiscoveryService.getInstance();
    this.initializeDefaultScenes();
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  private initializeDefaultScenes() {
    const defaultScenes: Scene[] = [
      {
        id: 'scene_night_mode',
        name: 'Mode Nuit',
        description: 'Prépare la maison pour la nuit',
        icon: '🌙',
        actions: [
          {
            deviceId: 'homekit_lock_1',
            state: { status: 'locked' }
          },
          {
            deviceId: 'google_light_1',
            state: { status: 'off' }
          },
          {
            deviceId: 'alexa_camera_1',
            state: { status: 'active', nightVision: true }
          }
        ],
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'scene_morning',
        name: 'Réveil',
        description: 'Prépare la maison pour le matin',
        icon: '🌅',
        actions: [
          {
            deviceId: 'google_light_1',
            state: { 
              status: 'on',
              brightness: 70,
              colorTemperature: 4000
            }
          },
          {
            deviceId: 'google_thermostat_1',
            state: {
              status: 'active',
              targetTemperature: 21,
              mode: 'heat'
            }
          }
        ],
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'scene_away',
        name: 'Absence',
        description: 'Sécurise la maison pendant votre absence',
        icon: '🏃',
        actions: [
          {
            deviceId: 'homekit_lock_1',
            state: { status: 'locked' }
          },
          {
            deviceId: 'google_light_1',
            state: { status: 'off' }
          },
          {
            deviceId: 'alexa_camera_1',
            state: { status: 'active' }
          },
          {
            deviceId: 'alexa_sensor_1',
            state: { status: 'active' }
          },
          {
            deviceId: 'google_thermostat_1',
            state: { 
              status: 'active',
              mode: 'eco',
              targetTemperature: 18
            }
          }
        ],
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultScenes.forEach(scene => this.scenes.set(scene.id, scene));
  }

  public async activateScene(sceneId: string): Promise<void> {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    try {
      // Exécuter toutes les actions de la scène en parallèle
      const actionPromises = scene.actions.map(async (action) => {
        try {
          await this.deviceService.setDeviceState(
            { id: action.deviceId } as Device,
            action.state
          );
        } catch (error) {
          console.error(`Error executing action for device ${action.deviceId}:`, error);
          throw error;
        }
      });

      await Promise.all(actionPromises);

      // Mettre à jour l'état de la scène
      this.scenes.set(sceneId, {
        ...scene,
        isActive: true,
        lastTriggered: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error activating scene ${sceneId}:`, error);
      throw error;
    }
  }

  public async deactivateScene(sceneId: string): Promise<void> {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    // Mettre à jour l'état de la scène
    this.scenes.set(sceneId, {
      ...scene,
      isActive: false,
      updatedAt: new Date().toISOString()
    });
  }

  public getScene(sceneId: string): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  public getAllScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  public async createScene(scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scene> {
    const newScene: Scene = {
      ...scene,
      id: `scene_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scenes.set(newScene.id, newScene);
    return newScene;
  }

  public async updateScene(sceneId: string, updates: Partial<Scene>): Promise<Scene> {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    const updatedScene: Scene = {
      ...scene,
      ...updates,
      id: scene.id, // Empêcher la modification de l'ID
      updatedAt: new Date().toISOString()
    };

    this.scenes.set(sceneId, updatedScene);
    return updatedScene;
  }

  public async deleteScene(sceneId: string): Promise<void> {
    if (!this.scenes.has(sceneId)) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    this.scenes.delete(sceneId);
  }

  public async validateScene(scene: Scene): Promise<boolean> {
    try {
      // Vérifier que tous les appareils existent
      for (const action of scene.actions) {
        const device = await this.deviceService.getDeviceState({ id: action.deviceId } as Device);
        if (!device) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
