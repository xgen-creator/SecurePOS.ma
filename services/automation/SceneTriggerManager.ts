import { Device } from '../../components/devices/types';
import { Scene, SceneManager } from './SceneManager';
import { DeviceDiscoveryService } from '../devices/DeviceDiscoveryService';

export interface TriggerCondition {
  deviceId: string;
  type: 'state_change' | 'value_threshold' | 'motion_detected' | 'presence_detected';
  value?: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
  duration?: number; // En secondes
}

export interface SceneTrigger {
  id: string;
  sceneId: string;
  name: string;
  description?: string;
  conditions: TriggerCondition[];
  operator: 'and' | 'or';
  enabled: boolean;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export class SceneTriggerManager {
  private static instance: SceneTriggerManager;
  private triggers: Map<string, SceneTrigger> = new Map();
  private sceneManager: SceneManager;
  private deviceService: DeviceDiscoveryService;
  private deviceStates: Map<string, any> = new Map();
  private conditionTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.sceneManager = SceneManager.getInstance();
    this.deviceService = DeviceDiscoveryService.getInstance();
    this.initializeDefaultTriggers();
    this.startDeviceMonitoring();
  }

  public static getInstance(): SceneTriggerManager {
    if (!SceneTriggerManager.instance) {
      SceneTriggerManager.instance = new SceneTriggerManager();
    }
    return SceneTriggerManager.instance;
  }

  private initializeDefaultTriggers() {
    const defaultTriggers: SceneTrigger[] = [
      {
        id: 'trigger_motion_night',
        sceneId: 'scene_night_mode',
        name: 'Mouvement nocturne',
        description: 'Active le mode nuit lors d\'une détection de mouvement tard le soir',
        conditions: [
          {
            deviceId: 'alexa_sensor_1',
            type: 'motion_detected'
          }
        ],
        operator: 'and',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'trigger_presence_welcome',
        sceneId: 'scene_morning',
        name: 'Détection de présence',
        description: 'Active la scène d\'accueil lors d\'une détection de présence',
        conditions: [
          {
            deviceId: 'alexa_sensor_1',
            type: 'presence_detected'
          }
        ],
        operator: 'and',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'trigger_temperature',
        sceneId: 'scene_morning',
        name: 'Température basse',
        description: 'Ajuste la température si elle descend trop bas',
        conditions: [
          {
            deviceId: 'google_thermostat_1',
            type: 'value_threshold',
            value: 18,
            operator: 'lt',
            duration: 300 // 5 minutes
          }
        ],
        operator: 'and',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultTriggers.forEach(trigger => this.triggers.set(trigger.id, trigger));
  }

  private startDeviceMonitoring() {
    // Surveiller les changements d'état des appareils toutes les 5 secondes
    setInterval(async () => {
      try {
        const devices = await this.deviceService.getAllDevices();
        for (const device of devices) {
          const newState = await this.deviceService.getDeviceState(device);
          const oldState = this.deviceStates.get(device.id);
          
          if (this.hasStateChanged(oldState, newState)) {
            this.deviceStates.set(device.id, newState);
            this.checkTriggers(device.id, newState, oldState);
          }
        }
      } catch (error) {
        console.error('Error monitoring devices:', error);
      }
    }, 5000);
  }

  private hasStateChanged(oldState: any, newState: any): boolean {
    if (!oldState) return true;
    
    // Comparer les états pertinents selon le type d'appareil
    switch (newState.type) {
      case 'sensor':
        return (
          oldState.status !== newState.status ||
          oldState.lastDetection !== newState.lastDetection
        );

      case 'thermostat':
        return (
          oldState.currentTemperature !== newState.currentTemperature ||
          oldState.targetTemperature !== newState.targetTemperature ||
          oldState.mode !== newState.mode
        );

      default:
        return oldState.status !== newState.status;
    }
  }

  private async checkTriggers(deviceId: string, newState: any, oldState: any) {
    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;

      const relevantConditions = trigger.conditions.filter(
        condition => condition.deviceId === deviceId
      );

      if (relevantConditions.length === 0) continue;

      const conditionResults = await Promise.all(
        relevantConditions.map(condition =>
          this.evaluateCondition(condition, newState, oldState)
        )
      );

      const shouldTrigger = trigger.operator === 'and'
        ? conditionResults.every(result => result)
        : conditionResults.some(result => result);

      if (shouldTrigger) {
        try {
          await this.sceneManager.activateScene(trigger.sceneId);
          
          // Mettre à jour les informations de déclenchement
          trigger.lastTriggered = new Date().toISOString();
          trigger.updatedAt = new Date().toISOString();
          
          this.triggers.set(trigger.id, trigger);
        } catch (error) {
          console.error(`Error triggering scene ${trigger.sceneId}:`, error);
        }
      }
    }
  }

  private async evaluateCondition(
    condition: TriggerCondition,
    newState: any,
    oldState: any
  ): Promise<boolean> {
    switch (condition.type) {
      case 'state_change':
        return this.hasStateChanged(oldState, newState);

      case 'value_threshold':
        if (!condition.value || !condition.operator) return false;
        
        const value = this.getDeviceValue(newState);
        if (value === undefined) return false;

        // Vérifier si la condition de durée est respectée
        if (condition.duration) {
          const timerId = `${condition.deviceId}_${condition.type}`;
          
          if (this.evaluateThreshold(value, condition.value, condition.operator)) {
            if (!this.conditionTimers.has(timerId)) {
              this.conditionTimers.set(
                timerId,
                setTimeout(() => {
                  this.conditionTimers.delete(timerId);
                }, condition.duration * 1000)
              );
            }
            return false;
          } else {
            const timer = this.conditionTimers.get(timerId);
            if (timer) {
              clearTimeout(timer);
              this.conditionTimers.delete(timerId);
            }
            return false;
          }
        }

        return this.evaluateThreshold(value, condition.value, condition.operator);

      case 'motion_detected':
        return (
          newState.type === 'sensor' &&
          newState.status === 'active' &&
          oldState?.status !== 'active'
        );

      case 'presence_detected':
        return (
          newState.type === 'sensor' &&
          newState.status === 'active' &&
          oldState?.status !== 'active'
        );

      default:
        return false;
    }
  }

  private getDeviceValue(state: any): number | undefined {
    switch (state.type) {
      case 'thermostat':
        return state.currentTemperature;
      case 'light':
        return state.brightness;
      default:
        return undefined;
    }
  }

  private evaluateThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'eq':
        return value === threshold;
      case 'neq':
        return value !== threshold;
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  public getTrigger(triggerId: string): SceneTrigger | undefined {
    return this.triggers.get(triggerId);
  }

  public getAllTriggers(): SceneTrigger[] {
    return Array.from(this.triggers.values());
  }

  public async createTrigger(trigger: Omit<SceneTrigger, 'id' | 'createdAt' | 'updatedAt'>): Promise<SceneTrigger> {
    const newTrigger: SceneTrigger = {
      ...trigger,
      id: `trigger_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.triggers.set(newTrigger.id, newTrigger);
    return newTrigger;
  }

  public async updateTrigger(triggerId: string, updates: Partial<SceneTrigger>): Promise<SceneTrigger> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    const updatedTrigger: SceneTrigger = {
      ...trigger,
      ...updates,
      id: trigger.id,
      updatedAt: new Date().toISOString()
    };

    this.triggers.set(triggerId, updatedTrigger);
    return updatedTrigger;
  }

  public async deleteTrigger(triggerId: string): Promise<void> {
    if (!this.triggers.has(triggerId)) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    this.triggers.delete(triggerId);
  }

  public async validateTrigger(trigger: SceneTrigger): Promise<boolean> {
    try {
      // Vérifier que la scène existe
      const scene = this.sceneManager.getScene(trigger.sceneId);
      if (!scene) {
        return false;
      }

      // Vérifier que tous les appareils existent
      for (const condition of trigger.conditions) {
        const device = await this.deviceService.getDeviceState(
          { id: condition.deviceId } as Device
        );
        if (!device) {
          return false;
        }

        // Vérifier la validité des conditions
        switch (condition.type) {
          case 'value_threshold':
            if (
              condition.value === undefined ||
              !condition.operator ||
              !['eq', 'neq', 'gt', 'lt', 'gte', 'lte'].includes(condition.operator)
            ) {
              return false;
            }
            break;

          case 'state_change':
          case 'motion_detected':
          case 'presence_detected':
            break;

          default:
            return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  public destroy() {
    // Nettoyer les timers
    for (const timer of this.conditionTimers.values()) {
      clearTimeout(timer);
    }
    this.conditionTimers.clear();
  }
}
