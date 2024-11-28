import type { Device } from '../../components/devices/types';

const STORAGE_KEY = 'scanbell_device_states';

export class DeviceStateStorage {
  private static instance: DeviceStateStorage;
  private devices: Device[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DeviceStateStorage {
    if (!DeviceStateStorage.instance) {
      DeviceStateStorage.instance = new DeviceStateStorage();
    }
    return DeviceStateStorage.instance;
  }

  public getDevices(): Device[] {
    return [...this.devices];
  }

  public getDevice(id: string): Device | undefined {
    return this.devices.find(d => d.id === id);
  }

  public async updateDevice(device: Device): Promise<void> {
    const index = this.devices.findIndex(d => d.id === device.id);
    if (index >= 0) {
      this.devices[index] = {
        ...device,
        lastSeen: new Date().toISOString()
      };
    } else {
      this.devices.push({
        ...device,
        lastSeen: new Date().toISOString()
      });
    }
    await this.saveToStorage();
  }

  public async updateDevices(devices: Device[]): Promise<void> {
    this.devices = devices.map(device => ({
      ...device,
      lastSeen: new Date().toISOString()
    }));
    await this.saveToStorage();
  }

  public async removeDevice(id: string): Promise<void> {
    this.devices = this.devices.filter(d => d.id !== id);
    await this.saveToStorage();
  }

  public async clearDevices(): Promise<void> {
    this.devices = [];
    await this.saveToStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.devices = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading device states:', error);
      this.devices = [];
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.devices));
    } catch (error) {
      console.error('Error saving device states:', error);
    }
  }
}
