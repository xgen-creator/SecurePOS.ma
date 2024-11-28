// communicationService.js
class CommunicationService {
  constructor() {
    this.activeConnections = new Map();
    this.messageQueue = new Map();
    this.callHandlers = new Map();
  }

  async initializeConnection(userId, deviceId) {
    try {
      const connection = await this.createWebSocketConnection(userId, deviceId);
      
      connection.on('message', async (message) => {
        await this.handleIncomingMessage(message, userId);
      });

      connection.on('error', async (error) => {
        await this.handleConnectionError(error, userId);
      });

      this.activeConnections.set(userId, connection);
      return true;
    } catch (error) {
      console.error('Erreur d\'initialisation de la connexion:', error);
      return false;
    }
  }

  async sendMessage(from, to, content, type = 'text') {
    const message = {
      id: this.generateMessageId(),
      from,
      to,
      content,
      type,
      timestamp: new Date(),
      status: 'sending'
    };

    try {
      // Enregistrer le message
      await this.saveMessage(message);

      // Envoyer le message
      const connection = this.activeConnections.get(to);
      if (connection) {
        await this.deliverMessage(connection, message);
        message.status = 'sent';
      } else {
        // Mettre en file d'attente si le destinataire est hors ligne
        this.queueMessage(message);
        message.status = 'queued';
      }

      return message;
    } catch (error) {
      message.status = 'failed';
      console.error('Erreur d\'envoi du message:', error);
      throw error;
    }
  }

  async initiateCall(from, to, type = 'audio') {
    const callId = this.generateCallId();
    
    try {
      const call = {
        id: callId,
        from,
        to,
        type,
        startTime: new Date(),
        status: 'initiating'
      };

      // Créer la session d'appel
      const session = await this.createCallSession(call);
      
      // Notifier le destinataire
      await this.notifyIncomingCall(to, call);

      // Configurer le gestionnaire d'appel
      this.setupCallHandler(callId, session);

      return call;
    } catch (error) {
      console.error('Erreur d\'initiation d\'appel:', error);
      throw error;
    }
  }

  async handleIncomingCall(callId, response) {
    const handler = this.callHandlers.get(callId);
    if (!handler) throw new Error('Session d\'appel non trouvée');

    try {
      if (response === 'accept') {
        await handler.acceptCall();
      } else {
        await handler.rejectCall(response);
      }

      return true;
    } catch (error) {
      console.error('Erreur de gestion d\'appel entrant:', error);
      throw error;
    }
  }

  async endCall(callId) {
    const handler = this.callHandlers.get(callId);
    if (!handler) throw new Error('Session d\'appel non trouvée');

    try {
      await handler.endCall();
      this.callHandlers.delete(callId);
      return true;
    } catch (error) {
      console.error('Erreur de fin d\'appel:', error);
      throw error;
    }
  }

  async getMessageHistory(userId, options = {}) {
    const query = {
      userId,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    try {
      const messages = await this.fetchMessages(query);
      return this.formatMessageHistory(messages);
    } catch (error) {
      console.error('Erreur de récupération de l\'historique:', error);
      throw error;
    }
  }

  async sendQuickResponse(deviceId, responseType) {
    const responses = {
      ACCEPT: "Je vous ouvre tout de suite",
      WAIT: "Merci de patienter un moment",
      LEAVE: "Veuillez laisser le colis devant la porte",
      UNAVAILABLE: "Je ne suis pas disponible actuellement"
    };

    const message = responses[responseType];
    if (!message) throw new Error('Type de réponse invalide');

    return await this.sendMessage(
      'SYSTEM',
      deviceId,
      message,
      'quick_response'
    );
  }
}

export default new CommunicationService();
