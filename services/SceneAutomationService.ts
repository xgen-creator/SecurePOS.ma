import { eventService } from './EventService';
import { loggingService } from './LoggingService';
import { notificationService } from './NotificationService';
import { logger } from './utils/logger';
import { ExpressionAnalysis, MoodPrediction } from './ExpressionAnalysisService';
import { Scene, SceneAction } from '../interfaces/scene.interface';
import { SceneActionService } from './SceneActionService';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  priority: number;
  isEnabled: boolean;
  lastTriggered?: Date;
  cooldownMinutes?: number;
}

interface AutomationCondition {
  type: 'expression' | 'mood' | 'time' | 'presence' | 'custom';
  parameters: Record<string, any>;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'between';
}

interface AutomationAction {
  type: 'scene' | 'notification' | 'custom';
  parameters: Record<string, any>;
}

/**
 * Service d'automatisation des scènes
 * @singleton Gère les règles d'automatisation basées sur événements
 */
class SceneAutomationService {
  private static instance: SceneAutomationService;
  private static isDestroyed = false;
  private rules: AutomationRule[];
  private sceneActionService: SceneActionService;
  private subscriptionId: string | null = null;

  private constructor() {
    this.rules = [];
    this.sceneActionService = SceneActionService.getInstance();
    this.setupEventListeners();
    SceneAutomationService.isDestroyed = false;
  }

  public static getInstance(): SceneAutomationService {
    if (!SceneAutomationService.instance || SceneAutomationService.isDestroyed) {
      SceneAutomationService.instance = new SceneAutomationService();
    }
    return SceneAutomationService.instance;
  }

  /**
   * Destroys the service instance and cleans up all resources
   * Unsubscribes from events and clears rules
   */
  public static destroy(): void {
    if (SceneAutomationService.isDestroyed) {
      logger.warn('SceneAutomationService already destroyed');
      return;
    }

    const instance = SceneAutomationService.instance;
    if (instance && instance.subscriptionId) {
      // Unsubscribe from eventService
      eventService.unsubscribe(instance.subscriptionId);
      logger.debug(`Unsubscribed from eventService: ${instance.subscriptionId}`);
    }

    // Clear rules
    if (instance) {
      instance.rules = [];
    }

    SceneAutomationService.isDestroyed = true;
    SceneAutomationService.instance = null as any;

    logger.info('SceneAutomationService destroyed successfully');
  }

  private setupEventListeners(): void {
    this.subscriptionId = 'scene-automation';
    eventService.subscribe({
      id: this.subscriptionId,
      eventTypes: ['expression-analyzed', 'face-detected', 'presence-changed'],
      callback: this.handleEvent.bind(this)
    });
  }

  private async handleEvent(event: any): Promise<void> {
    try {
      const { type, data } = event;
      
      // Filtrer les règles actives
      const activeRules = this.rules.filter(rule => 
        rule.isEnabled && this.isRuleReadyToTrigger(rule)
      );

      // Trier par priorité
      activeRules.sort((a, b) => b.priority - a.priority);

      // Évaluer chaque règle
      for (const rule of activeRules) {
        if (await this.evaluateRule(rule, type, data)) {
          await this.executeRule(rule, data);
          rule.lastTriggered = new Date();
          
          // Émettre un événement
          eventService.emit('automation-rule-triggered', {
            ruleId: rule.id,
            ruleName: rule.name,
            trigger: type,
            data
          }, 'SceneAutomationService');
        }
      }
    } catch (error) {
      loggingService.error('Error handling automation event', error as Error);
    }
  }

  private isRuleReadyToTrigger(rule: AutomationRule): boolean {
    if (!rule.lastTriggered || !rule.cooldownMinutes) {
      return true;
    }

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
    
    return timeSinceLastTrigger >= cooldownMs;
  }

  private async evaluateRule(
    rule: AutomationRule,
    eventType: string,
    data: any
  ): Promise<boolean> {
    try {
      // Vérifier que toutes les conditions sont remplies
      for (const condition of rule.conditions) {
        if (!await this.evaluateCondition(condition, eventType, data)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      loggingService.error(`Error evaluating rule ${rule.id}`, error as Error);
      return false;
    }
  }

  private async evaluateCondition(
    condition: AutomationCondition,
    eventType: string,
    data: any
  ): Promise<boolean> {
    switch (condition.type) {
      case 'expression':
        return this.evaluateExpressionCondition(condition, data.analysis as ExpressionAnalysis);
      
      case 'mood':
        return this.evaluateMoodCondition(condition, data.prediction as MoodPrediction);
      
      case 'time':
        return this.evaluateTimeCondition(condition);
      
      case 'presence':
        return this.evaluatePresenceCondition(condition, data);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, data);
      
      default:
        return false;
    }
  }

  private evaluateExpressionCondition(
    condition: AutomationCondition,
    analysis: ExpressionAnalysis
  ): boolean {
    const { parameters, operator } = condition;

    switch (operator) {
      case 'equals':
        return analysis.dominantEmotion === parameters.emotion;
      
      case 'notEquals':
        return analysis.dominantEmotion !== parameters.emotion;
      
      case 'greaterThan':
        return analysis.emotionConfidence > parameters.confidence;
      
      default:
        return false;
    }
  }

  private evaluateMoodCondition(
    condition: AutomationCondition,
    prediction: MoodPrediction
  ): boolean {
    const { parameters, operator } = condition;

    switch (operator) {
      case 'equals':
        return prediction.currentMood === parameters.mood;
      
      case 'contains':
        return prediction.previousMoods.includes(parameters.mood);
      
      case 'greaterThan':
        return prediction.confidence > parameters.confidence;
      
      default:
        return false;
    }
  }

  private evaluateTimeCondition(condition: AutomationCondition): boolean {
    const { parameters, operator } = condition;
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    switch (operator) {
      case 'between':
        const startTime = parameters.startTime.split(':').map(Number);
        const endTime = parameters.endTime.split(':').map(Number);
        const current = currentHour * 60 + currentMinute;
        const start = startTime[0] * 60 + startTime[1];
        const end = endTime[0] * 60 + endTime[1];
        
        return current >= start && current <= end;
      
      default:
        return false;
    }
  }

  private evaluatePresenceCondition(
    condition: AutomationCondition,
    data: any
  ): boolean {
    const { parameters, operator } = condition;

    switch (operator) {
      case 'equals':
        return data.presence === parameters.status;
      
      default:
        return false;
    }
  }

  private evaluateCustomCondition(
    condition: AutomationCondition,
    data: any
  ): boolean {
    // Implémenter la logique personnalisée ici
    return true;
  }

  private async executeRule(rule: AutomationRule, data: any): Promise<void> {
    try {
      for (const action of rule.actions) {
        await this.executeAction(action, data);
      }
      
      loggingService.info(`Rule executed successfully: ${rule.name}`, { ruleId: rule.id, data });
    } catch (error) {
      loggingService.error(`Error executing rule ${rule.id}`, error as Error);
      
      notificationService.createNotification({
        type: 'automation-error',
        title: 'Erreur d\'automatisation',
        message: `Erreur lors de l'exécution de la règle "${rule.name}"`,
        severity: 'error',
        metadata: { rule, error }
      });
    }
  }

  private async executeAction(action: AutomationAction, data: any): Promise<void> {
    switch (action.type) {
      case 'scene':
        await this.executeSceneAction(action.parameters);
        break;
      
      case 'notification':
        this.executeNotificationAction(action.parameters);
        break;
      
      case 'custom':
        await this.executeCustomAction(action.parameters, data);
        break;
    }
  }

  private async executeSceneAction(parameters: Record<string, any>): Promise<void> {
    const { sceneId, operation = 'activate' } = parameters;
    
    switch (operation) {
      case 'activate':
        await SceneActionService.activateScene(sceneId);
        break;
      
      case 'deactivate':
        await this.sceneActionService.deactivateScene(sceneId);
        break;
    }
  }

  private executeNotificationAction(parameters: Record<string, any>): void {
    notificationService.createNotification({
      type: parameters.type || 'automation',
      title: parameters.title,
      message: parameters.message,
      severity: parameters.severity || 'info',
      metadata: parameters.metadata
    });
  }

  private async executeCustomAction(
    parameters: Record<string, any>,
    data: any
  ): Promise<void> {
    // Implémenter la logique personnalisée ici
  }

  public addRule(rule: Omit<AutomationRule, 'id'>): string {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AutomationRule = {
      ...rule,
      id,
      isEnabled: true
    };

    this.rules.push(newRule);
    loggingService.info(`New automation rule added: ${newRule.name}`, { ruleId: id });
    
    return id;
  }

  public updateRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    this.rules[index] = {
      ...this.rules[index],
      ...updates
    };

    loggingService.info(`Automation rule updated: ${this.rules[index].name}`, { ruleId });
  }

  public deleteRule(ruleId: string): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const deletedRule = this.rules.splice(index, 1)[0];
    loggingService.info(`Automation rule deleted: ${deletedRule.name}`, { ruleId });
  }

  public getRules(): AutomationRule[] {
    return [...this.rules];
  }

  public getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  public enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isEnabled = true;
      loggingService.info(`Automation rule enabled: ${rule.name}`, { ruleId });
    }
  }

  public disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isEnabled = false;
      loggingService.info(`Automation rule disabled: ${rule.name}`, { ruleId });
    }
  }
}

export const sceneAutomationService = SceneAutomationService.getInstance();
