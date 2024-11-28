import type { Device } from '../devices/types';
import type { AutomationCondition, AutomationAction } from './types';

export class DeviceAutomationService {
  private devices: Device[] = [];

  constructor(devices: Device[] = []) {
    this.devices = devices;
  }

  public setDevices(devices: Device[]) {
    this.devices = devices;
  }

  public async evaluateDeviceCondition(condition: AutomationCondition): Promise<boolean> {
    const config = condition.config as any;
    const device = this.devices.find(d => d.id === config.deviceId);
    
    if (!device) {
      console.warn(`Device ${config.deviceId} not found`);
      return false;
    }

    switch (device.type) {
      case 'lock':
        return device.status === config.state;

      case 'light':
        if (config.state === 'brightness') {
          return device.brightness === config.value;
        }
        return device.status === config.state;

      case 'camera':
        if (config.state === 'recording') {
          return device.recording === true;
        }
        return device.status === config.state;

      case 'sensor':
        const value = parseFloat(device.value.toString());
        const threshold = parseFloat(config.value.toString());

        switch (config.state) {
          case 'above':
            return value > threshold;
          case 'below':
            return value < threshold;
          case 'equals':
            return Math.abs(value - threshold) < 0.001; // Float comparison
          default:
            return false;
        }

      default:
        return false;
    }
  }

  public async executeDeviceAction(action: AutomationAction): Promise<void> {
    const config = action.config as any;
    const device = this.devices.find(d => d.id === config.deviceId);
    
    if (!device) {
      console.warn(`Device ${config.deviceId} not found`);
      return;
    }

    // Simuler l'exécution des commandes
    switch (device.type) {
      case 'lock':
        switch (config.command) {
          case 'lock':
            device.status = 'locked';
            break;
          case 'unlock':
            device.status = 'unlocked';
            break;
        }
        break;

      case 'light':
        switch (config.command) {
          case 'turn_on':
            device.status = 'on';
            device.brightness = 100;
            break;
          case 'turn_off':
            device.status = 'off';
            device.brightness = 0;
            break;
          case 'set_brightness':
            device.brightness = config.value;
            device.status = config.value > 0 ? 'on' : 'off';
            break;
          case 'set_color':
            device.color = config.value;
            break;
        }
        break;

      case 'camera':
        switch (config.command) {
          case 'start_recording':
            device.recording = true;
            device.status = 'active';
            break;
          case 'stop_recording':
            device.recording = false;
            break;
          case 'take_snapshot':
            // Simuler la prise de photo
            console.log(`Taking snapshot with camera ${device.name}`);
            break;
        }
        break;
    }

    // Mettre à jour la date de dernière activité
    device.lastSeen = new Date().toISOString();

    // En situation réelle, nous enverrions ces commandes aux appareils via leur API respective
    console.log(`Executed command ${config.command} on device ${device.name}`);
  }

  // Méthode utilitaire pour formater l'état d'un appareil en texte lisible
  public formatDeviceState(device: Device): string {
    switch (device.type) {
      case 'lock':
        return device.status === 'locked' ? 'Verrouillé' : 'Déverrouillé';
      
      case 'light':
        if (device.status === 'off') return 'Éteint';
        return `Allumé (${device.brightness}%)`;
      
      case 'camera':
        if (device.recording) return 'En enregistrement';
        return device.status === 'active' ? 'Active' : 'Inactive';
      
      case 'sensor':
        return `${device.value} ${device.unit}`;
      
      default:
        return 'État inconnu';
    }
  }
}
