// securityIntegrationService.js
class SecurityIntegrationService {
  constructor() {
    this.integrations = new Map();
    this.activeConnections = new Map();
    this.supportedSystems = {
      'alarm': this.initAlarmSystem,
      'camera': this.initCameraSystem,
      'access_control': this.initAccessControl,
      'home_automation': this.initHomeAutomation
    };
  }

  async initializeIntegration(systemType, config) {
    if (!this.supportedSystems[systemType]) {
      throw new Error(`Système non supporté: ${systemType}`);
    }

    try {
      const integration = await this.supportedSystems[systemType](config);
      this.integrations.set(config.id, integration);
      
      await this.setupEventListeners(integration);
      await this.validateConnection(integration);
      
      return integration.id;
    } catch (error) {
      console.error(`Erreur d'initialisation ${systemType}:`, error);
      throw error;
    }
  }

  async initAlarmSystem(config) {
    return {
      id: config.id,
      type: 'alarm',
      protocol: config.protocol,
      endpoints: {
        status: `${config.baseUrl}/status`,
        arm: `${config.baseUrl}/arm`,
        disarm: `${config.baseUrl}/disarm`,
        zones: `${config.baseUrl}/zones`
      },
      auth: {
        type: config.authType,
        credentials: this.encryptCredentials(config.credentials)
      }
    };
  }

  async initCameraSystem(config) {
    return {
      id: config.id,
      type: 'camera',
      protocol: config.protocol,
      streamEndpoints: {
        rtsp: config.rtspUrl,
        webrtc: config.webrtcUrl,
        snapshot: config.snapshotUrl
      },
      capabilities: {
        ptz: config.hasPTZ,
        audio: config.hasAudio,
        nightVision: config.hasNightVision
      }
    };
  }

  async initAccessControl(config) {
    return {
      id: config.id,
      type: 'access_control',
      protocol: config.protocol,
      controllers: config.controllers.map(ctrl => ({
        id: ctrl.id,
        type: ctrl.type,
        location: ctrl.location,
        endpoints: {
          status: `${ctrl.baseUrl}/status`,
          control: `${ctrl.baseUrl}/control`,
          logs: `${ctrl.baseUrl}/logs`
        }
      }))
    };
  }

  async handleSecurityEvent(event) {
    const integration = this.integrations.get(event.sourceId);
    if (!integration) return;

    // Normaliser l'événement
    const normalizedEvent = await this.normalizeEvent(event, integration.type);

    // Vérifier les règles de corrélation
    const correlatedEvents = await this.correlateEvents(normalizedEvent);

    // Exécuter les actions appropriées
    if (correlatedEvents.length > 0) {
      await this.executeIntegratedResponse(correlatedEvents);
    }
  }

  async correlateEvents(event) {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const relatedEvents = [];

    // Rechercher des événements corrélés
    for (const [, integration] of this.integrations) {
      const events = await this.getRecentEvents(integration.id, timeWindow);
      relatedEvents.push(...events);
    }

    return this.analyzeEventCorrelation(event, relatedEvents);
  }

  async executeIntegratedResponse(events) {
    const response = await this.determineResponse(events);
    
    // Exécuter les actions sur chaque système concerné
    for (const action of response.actions) {
      const integration = this.integrations.get(action.targetSystem);
      if (integration) {
        await this.executeAction(integration, action);
      }
    }
  }

  async monitorSystemHealth() {
    const healthStatus = {};

    for (const [id, integration] of this.integrations) {
      healthStatus[id] = await this.checkIntegrationHealth(integration);
    }

    return healthStatus;
  }
}

export default new SecurityIntegrationService();
