import { DeviceManager } from '../devices/DeviceManager';
import { EventEmitter } from 'events';
import type { Rule } from '../../components/automation/RuleBuilder';

interface TriggerContext {
  timestamp: number;
  deviceStates: Map<string, any>;
  environmentData: {
    time: Date;
    sunriseTime?: Date;
    sunsetTime?: Date;
    temperature?: number;
    humidity?: number;
  };
}

export class RuleTriggerService {
  private static instance: RuleTriggerService;
  private rules: Map<string, Rule>;
  private deviceManager: DeviceManager;
  private eventEmitter: EventEmitter;
  private evaluationInterval: NodeJS.Timeout | null;
  private lastEvaluations: Map<string, boolean>;
  private triggerHistory: Array<{
    ruleId: string;
    timestamp: number;
    triggered: boolean;
    context: TriggerContext;
  }>;

  private constructor() {
    this.rules = new Map();
    this.deviceManager = DeviceManager.getInstance();
    this.eventEmitter = new EventEmitter();
    this.evaluationInterval = null;
    this.lastEvaluations = new Map();
    this.triggerHistory = [];

    // Démarrer l'évaluation périodique
    this.startEvaluation();
    
    // Écouter les changements d'état des appareils
    this.deviceManager.on('deviceStateChange', this.handleDeviceStateChange.bind(this));
  }

  public static getInstance(): RuleTriggerService {
    if (!RuleTriggerService.instance) {
      RuleTriggerService.instance = new RuleTriggerService();
    }
    return RuleTriggerService.instance;
  }

  private async startEvaluation() {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }

    this.evaluationInterval = setInterval(() => {
      this.evaluateAllRules();
    }, 1000); // Évaluer toutes les secondes
  }

  private async evaluateAllRules() {
    const context = this.buildTriggerContext();

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.evaluateRule(rule, context);
      const previouslyTriggered = this.lastEvaluations.get(ruleId) || false;

      if (shouldTrigger !== previouslyTriggered) {
        this.lastEvaluations.set(ruleId, shouldTrigger);
        
        if (shouldTrigger) {
          this.executeRuleActions(rule);
        }

        this.triggerHistory.push({
          ruleId,
          timestamp: Date.now(),
          triggered: shouldTrigger,
          context
        });

        // Limiter l'historique à 1000 entrées
        if (this.triggerHistory.length > 1000) {
          this.triggerHistory.shift();
        }

        this.eventEmitter.emit('ruleTriggerChange', {
          ruleId,
          triggered: shouldTrigger,
          context
        });
      }
    }
  }

  private buildTriggerContext(): TriggerContext {
    const now = new Date();
    const deviceStates = new Map();
    
    // Récupérer l'état de tous les appareils
    for (const device of this.deviceManager.getAllDevices()) {
      deviceStates.set(device.id, device.getState());
    }

    return {
      timestamp: now.getTime(),
      deviceStates,
      environmentData: {
        time: now,
        // TODO: Ajouter les données de lever/coucher du soleil
        // TODO: Ajouter les données de température/humidité
      }
    };
  }

  private async evaluateRule(rule: Rule, context: TriggerContext): Promise<boolean> {
    try {
      // Si pas de conditions, la règle est toujours vraie
      if (!rule.conditions || rule.conditions.length === 0) {
        return true;
      }

      // Évaluer chaque condition
      const results = await Promise.all(
        rule.conditions.map(condition => this.evaluateCondition(condition, context))
      );

      // Par défaut, toutes les conditions doivent être vraies (AND)
      return results.every(result => result);
    } catch (error) {
      console.error(`Erreur lors de l'évaluation de la règle ${rule.id}:`, error);
      return false;
    }
  }

  private async evaluateCondition(condition: any, context: TriggerContext): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'time_range': {
          const now = context.environmentData.time;
          const currentDay = now.getDay();
          
          // Vérifier si le jour actuel est dans les jours autorisés
          if (!condition.days.includes(currentDay)) {
            return false;
          }

          // Convertir les heures en minutes depuis minuit
          const timeToMinutes = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const currentMinutes = timeToMinutes(`${now.getHours()}:${now.getMinutes()}`);
          const startMinutes = timeToMinutes(condition.startTime);
          const endMinutes = timeToMinutes(condition.endTime);

          // Gérer le cas où la période traverse minuit
          if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
          }

          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }

        case 'device_state': {
          const deviceState = context.deviceStates.get(condition.deviceId);
          if (!deviceState) return false;

          switch (condition.operator) {
            case 'equals':
              return deviceState[condition.property] === condition.value;
            case 'not_equals':
              return deviceState[condition.property] !== condition.value;
            case 'greater_than':
              return deviceState[condition.property] > condition.value;
            case 'less_than':
              return deviceState[condition.property] < condition.value;
            default:
              return false;
          }
        }

        // Autres types de conditions à implémenter...
        
        default:
          console.warn(`Type de condition non pris en charge: ${condition.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Erreur lors de l'évaluation de la condition:`, error);
      return false;
    }
  }

  private async executeRuleActions(rule: Rule) {
    try {
      for (const action of rule.actions) {
        await this.executeAction(action);
      }
    } catch (error) {
      console.error(`Erreur lors de l'exécution des actions de la règle ${rule.id}:`, error);
    }
  }

  private async executeAction(action: any) {
    try {
      switch (action.type) {
        case 'device_control': {
          const device = this.deviceManager.getDevice(action.deviceId);
          if (device) {
            await device.setState(action.state);
          }
          break;
        }

        case 'scene_activation': {
          // TODO: Implémenter l'activation de scène
          break;
        }

        case 'notification': {
          // TODO: Implémenter le système de notification
          break;
        }

        default:
          console.warn(`Type d'action non pris en charge: ${action.type}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'exécution de l'action:`, error);
    }
  }

  // API publique

  public addRule(rule: Rule) {
    this.rules.set(rule.id, rule);
    this.lastEvaluations.set(rule.id, false);
  }

  public removeRule(ruleId: string) {
    this.rules.delete(ruleId);
    this.lastEvaluations.delete(ruleId);
  }

  public updateRule(rule: Rule) {
    this.rules.set(rule.id, rule);
    // Forcer une réévaluation
    this.lastEvaluations.delete(rule.id);
  }

  public getRuleStatus(ruleId: string) {
    return {
      enabled: this.rules.get(ruleId)?.enabled || false,
      lastTriggered: this.lastEvaluations.get(ruleId) || false,
      history: this.triggerHistory.filter(entry => entry.ruleId === ruleId)
    };
  }

  public on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }

  private handleDeviceStateChange(deviceId: string, newState: any) {
    // Forcer une réévaluation immédiate des règles
    this.evaluateAllRules();
  }
}

export default RuleTriggerService.getInstance();
