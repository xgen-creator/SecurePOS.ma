// deliveryService.js
const axios = require('axios');
const QRCode = require('qrcode');
const crypto = require('crypto');

class DeliveryService {
  constructor() {
    this.deliveryProviders = {
      'amazon': this.initAmazonAPI(),
      'fedex': this.initFedExAPI(),
      'ups': this.initUPSAPI()
    };
  }

  async createDeliverySession(deliveryInfo) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const accessCode = this.generateAccessCode();
    
    // Créer QR code unique pour cette livraison
    const qrCode = await QRCode.toDataURL(JSON.stringify({
      sessionId,
      accessCode,
      timestamp: Date.now()
    }));

    // Sauvegarder les informations de session
    await this.saveDeliverySession({
      sessionId,
      accessCode,
      deliveryInfo,
      qrCode,
      status: 'pending'
    });

    return {
      sessionId,
      accessCode,
      qrCode
    };
  }

  async trackDelivery(trackingNumber, provider) {
    const api = this.deliveryProviders[provider];
    if (!api) throw new Error('Provider non supporté');

    const tracking = await api.getTracking(trackingNumber);
    return this.standardizeTrackingInfo(tracking, provider);
  }

  async authorizeDelivery(sessionId, scannedCode) {
    const session = await this.getDeliverySession(sessionId);
    if (!session) throw new Error('Session invalide');

    const isValid = this.validateDeliveryCode(scannedCode, session);
    if (isValid) {
      await this.updateDeliveryStatus(sessionId, 'authorized');
      return true;
    }
    return false;
  }

  async handleDeliveryComplete(sessionId, proof) {
    const session = await this.getDeliverySession(sessionId);
    if (!session) throw new Error('Session invalide');

    // Sauvegarder la preuve de livraison
    const deliveryProof = await this.saveDeliveryProof(sessionId, proof);

    // Notifier le destinataire
    await notificationService.sendDeliveryNotification(session.userId, {
      type: 'DELIVERY_COMPLETE',
      trackingNumber: session.trackingNumber,
      proof: deliveryProof
    });

    await this.updateDeliveryStatus(sessionId, 'completed');
  }
}

module.exports = new DeliveryService();
