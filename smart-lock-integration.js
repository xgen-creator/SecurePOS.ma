// smartLockService.js
class SmartLockService {
  constructor() {
    this.supportedLocks = {
      'YALE': this.initYaleLock,
      'AUGUST': this.initAugustLock,
      'NUKI': this.initNukiLock
    };
    this.connectedLocks = new Map();
  }

  async initializeLock(type, config) {
    try {
      if (!this.supportedLocks[type]) {
        throw new Error(`Type de serrure non supporté: ${type}`);
      }

      const lock = await this.supportedLocks[type](config);
      this.connectedLocks.set(config.deviceId, lock);
      return true;
    } catch (error) {
      console.error('Erreur initialisation serrure:', error);
      return false;
    }
  }

  async controlLock(deviceId, action, options = {}) {
    const lock = this.connectedLocks.get(deviceId);
    if (!lock) throw new Error('Serrure non trouvée');

    switch (action) {
      case 'LOCK':
        return await this.lockDoor(lock, options);
      case 'UNLOCK':
        return await this.unlockDoor(lock, options);
      case 'CHECK':
        return await this.checkLockStatus(lock);
    }
  }

  async lockDoor(lock, { force = false, delay = 0 }) {
    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }

      await lock.lock({ force });
      
      // Enregistrer l'action
      await this.logLockAction({
        action: 'LOCK',
        timestamp: new Date(),
        success: true
      });

      return true;
    } catch (error) {
      console.error('Erreur verrouillage:', error);
      return false;
    }
  }

  async unlockDoor(lock, { temporaryAccess = false, duration = 30 }) {
    try {
      await lock.unlock();

      if (temporaryAccess) {
        // Programmer le reverrouillage
        setTimeout(async () => {
          await this.lockDoor(lock, { force: true });
        }, duration * 1000);
      }

      // Enregistrer l'action
      await this.logLockAction({
        action: 'UNLOCK',
        timestamp: new Date(),
        temporaryAccess,
        duration
      });

      return true;
    } catch (error) {
      console.error('Erreur déverrouillage:', error);
      return false;
    }
  }

  async authorizeDelivery(deliveryInfo) {
    const { lockId, deliveryId, courierCode } = deliveryInfo;
    const lock = this.connectedLocks.get(lockId);
    
    if (!lock) throw new Error('Serrure non trouvée');

    // Créer un code temporaire
    const tempCode = await this.generateTemporaryCode(lock);

    // Configurer les restrictions
    await this.setAccessRestrictions(lock, {
      code: tempCode,
      validFrom: deliveryInfo.expectedTime,
      validFor: 15, // minutes
      singleUse: true
    });

    return tempCode;
  }

  async monitorLockHealth(deviceId) {
    const lock = this.connectedLocks.get(deviceId);
    if (!lock) throw new Error('Serrure non trouvée');

    // Vérifier la batterie
    const batteryLevel = await lock.getBatteryLevel();
    if (batteryLevel < 20) {
      await this.sendLowBatteryAlert(deviceId, batteryLevel);
    }

    // Vérifier la connexion
    const connectionStatus = await lock.checkConnection();
    if (!connectionStatus.connected) {
      await this.sendConnectionAlert(deviceId, connectionStatus);
    }

    return {
      batteryLevel,
      connectionStatus,
      lastSync: new Date(),
      firmwareStatus: await lock.checkFirmware()
    };
  }
}

export default new SmartLockService();
