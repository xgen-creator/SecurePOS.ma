// alertRulesService.js
class AlertRulesService {
  constructor() {
    this.rules = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
  }

  async createRule(ruleConfig) {
    const ruleId = this.generateRuleId();
    const rule = {
      id: ruleId,
      ...ruleConfig,
      created: new Date(),
      status: 'active'
    };

    // Valider la règle
    await this.validateRule(rule);

    // Enregistrer la règle
    this.rules.set(ruleId, rule);

    // Initialiser les conditions de surveillance
    await this.initializeRuleMonitoring(rule);

    return ruleId;
  }

  async validateRule(rule) {
    // Vérifier la structure de base
    if (!rule.conditions || !rule.actions) {
      throw new Error('La règle doit avoir des conditions et des actions');
    }

    // Vérifier les conditions
    for (const condition of rule.conditions) {
      if (!this.isValidCondition(condition)) {
        throw new Error(`Condition invalide: ${condition.type}`);
      }
    }

    // Vérifier les actions
    for (const action of rule.actions) {
      if (!this.isValidAction(action)) {
        throw new Error(`Action invalide: ${action.type}`);
      }
    }
  }

  isValidCondition(condition) {
    const validConditions = [
      'motion_detected',
      'face_detected',
      'suspicious_activity',
      'time_range',
      'device_status',
      'multiple_visitors'
    ];

    return validConditions.includes(condition.type);
  }

  isValidAction(action) {
    const validActions = [
      'send_notification',
      'start_recording',
      'lock_door',
      'trigger_alarm',
      'send_email',
      'call_emergency'
    ];

    return validActions.includes(action.type);
  }

  async evaluateRule(ruleId, event) {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    // Vérifier toutes les conditions
    const conditionsMet = await this.checkConditions(rule.conditions, event);
    
    if (conditionsMet) {
      await this.executeActions(rule.actions, event);
      await this.logRuleExecution(rule, event);
      return true;
    }

    return false;
  }

  async checkConditions(conditions, event) {
    for (const condition of conditions) {
      const ismet = await this.evaluateCondition(condition, event);
      if (!ismet) return false;
    }
    return true;
  }

  async executeActions(actions, event) {
    const executionPromises = actions.map(action => 
      this.executeAction(action, event)
    );

    try {
      await Promise.all(executionPromises);
    } catch (error) {
      console.error('Erreur lors de l'exécution des actions:', error);
      // Gérer la reprise sur erreur si nécessaire
    }
  }

  async handleAlert(alertData) {
    const alertId = this.generateAlertId();
    const alert = {
      id: alertId,
      ...alertData,
      status: 'active',
      created: new Date(),
      updates: []
    };

    // Enregistrer l'alerte
    this.activeAlerts.set(alertId, alert);

    // Exécuter les actions d'alerte
    await this.processAlert(alert);

    return alertId;
  }

  async processAlert(alert) {
    // Déterminer la priorité
    const priority = this.calculateAlertPriority(alert);

    // Exécuter les actions selon la priorité
    switch (priority) {
      case 'high':
        await this.handleHighPriorityAlert(alert);
        break;
      case 'medium':
        await this.handleMediumPriorityAlert(alert);
        break;
      case 'low':
        await this.handleLowPriorityAlert(alert);
        break;
    }
  }

  calculateAlertPriority(alert) {
    // Logique de calcul de priorité basée sur différents facteurs
    let score = 0;

    // Type d'événement
    if (alert.type === 'suspicious_activity') score += 5;
    if (alert.type === 'multiple_visitors') score += 3;
    if (alert.type === 'motion_detected') score += 1;

    // Heure de la journée
    const hour = new Date(alert.created).getHours();
    if (hour >= 22 || hour <= 6) score += 2;

    // Historique récent
    const recentAlerts = this.getRecentAlerts(alert.deviceId);
    if (recentAlerts.length >= 3) score += 2;

    // Déterminer la priorité finale
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  async updateAlertStatus(alertId, status, details) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) throw new Error('Alerte non trouvée');

    alert.status = status;
    alert.updates.push({
      timestamp: new Date(),
      status,
      details
    });

    if (['resolved', 'cancelled'].includes(status)) {
      // Archiver l'alerte
      this.alertHistory.push(alert);
      this.activeAlerts.delete(alertId);
    }

    await this.logAlertUpdate(alert);
  }
}

export default new AlertRulesService();
