import type { Device, DevicePlatformId } from '../../components/devices/types';
import { HomeKitPlatform } from './platforms/HomeKitPlatform';
import { AlexaPlatform } from './platforms/AlexaPlatform';
import { GoogleHomePlatform } from './platforms/GoogleHomePlatform';
import { DeviceStateStorage } from '../storage/DeviceStateStorage';

export interface DevicePlatformAdapter {
  discover(): Promise<Device[]>;
  connect(device: Device): Promise<void>;
  disconnect(device: Device): Promise<void>;
  getState(device: Device): Promise<Partial<Device>>;
  setState(device: Device, state: Partial<Device>): Promise<void>;
}

export class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private platforms: Map<DevicePlatformId, DevicePlatformAdapter>;
  private storage: DeviceStateStorage;
  private isDiscovering: boolean = false;

  private constructor() {
    this.platforms = new Map();
    this.storage = DeviceStateStorage.getInstance();
    this.initializePlatforms();
  }

  public static getInstance(): DeviceDiscoveryService {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  private initializePlatforms() {
    this.platforms.set('homekit', new HomeKitPlatform());
    this.platforms.set('alexa', new AlexaPlatform());
    this.platforms.set('google_home', new GoogleHomePlatform());
  }

  public async startDiscovery(
    onDeviceFound?: (device: Device) => void,
    onError?: (error: Error) => void
  ): Promise<Device[]> {
    if (this.isDiscovering) {
      throw new Error('Discovery already in progress');
    }

    this.isDiscovering = true;
    const discoveredDevices: Device[] = [];

    try {
      // Découvrir les appareils sur toutes les plateformes en parallèle
      const discoveryPromises = Array.from(this.platforms.entries()).map(
        async ([platformId, platform]) => {
          try {
            const devices = await platform.discover();
            for (const device of devices) {
              // Vérifier si l'appareil existe déjà
              const existingDevice = await this.storage.getDevice(device.id);
              if (existingDevice) {
                // Mettre à jour l'état de l'appareil existant
                const updatedDevice = {
                  ...existingDevice,
                  ...device,
                  lastSeen: new Date().toISOString()
                };
                await this.storage.updateDevice(updatedDevice);
                discoveredDevices.push(updatedDevice);
                onDeviceFound?.(updatedDevice);
              } else {
                // Ajouter le nouvel appareil
                const newDevice = {
                  ...device,
                  lastSeen: new Date().toISOString()
                };
                await this.storage.updateDevice(newDevice);
                discoveredDevices.push(newDevice);
                onDeviceFound?.(newDevice);
              }
            }
          } catch (error) {
            console.error(`Error discovering devices for platform ${platformId}:`, error);
            onError?.(error as Error);
          }
        }
      );

      await Promise.all(discoveryPromises);
      return discoveredDevices;
    } finally {
      this.isDiscovering = false;
    }
  }

  public async connectDevice(device: Device): Promise<void> {
    const platform = this.platforms.get(device.platform);
    if (!platform) {
      throw new Error(`Platform ${device.platform} not supported`);
    }

    await platform.connect(device);
    await this.storage.updateDevice({
      ...device,
      lastSeen: new Date().toISOString()
    });
  }

  public async disconnectDevice(device: Device): Promise<void> {
    const platform = this.platforms.get(device.platform);
    if (!platform) {
      throw new Error(`Platform ${device.platform} not supported`);
    }

    await platform.disconnect(device);
  }

  public async getDeviceState(device: Device): Promise<Device> {
    const platform = this.platforms.get(device.platform);
    if (!platform) {
      throw new Error(`Platform ${device.platform} not supported`);
    }

    const state = await platform.getState(device);
    const updatedDevice = {
      ...device,
      ...state,
      lastSeen: new Date().toISOString()
    };

    await this.storage.updateDevice(updatedDevice);
    return updatedDevice;
  }

  public async setDeviceState(device: Device, state: Partial<Device>): Promise<Device> {
    const platform = this.platforms.get(device.platform);
    if (!platform) {
      throw new Error(`Platform ${device.platform} not supported`);
    }

    await platform.setState(device, state);
    const updatedDevice = {
      ...device,
      ...state,
      lastSeen: new Date().toISOString()
    };

    await this.storage.updateDevice(updatedDevice);
    return updatedDevice;
  }

  public async refreshDeviceStates(): Promise<void> {
    const devices = this.storage.getDevices();
    const refreshPromises = devices.map(device => this.getDeviceState(device));
    await Promise.all(refreshPromises);
  }
}
