import { Device } from '../../components/devices/types';
import { DeviceDiscoveryService } from '../devices/DeviceDiscoveryService';

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  deviceIds: string[];
  type?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export class DeviceGroupManager {
  private static instance: DeviceGroupManager;
  private groups: Map<string, DeviceGroup> = new Map();
  private deviceService: DeviceDiscoveryService;

  private constructor() {
    this.deviceService = DeviceDiscoveryService.getInstance();
    this.initializeDefaultGroups();
  }

  public static getInstance(): DeviceGroupManager {
    if (!DeviceGroupManager.instance) {
      DeviceGroupManager.instance = new DeviceGroupManager();
    }
    return DeviceGroupManager.instance;
  }

  private initializeDefaultGroups() {
    const defaultGroups: DeviceGroup[] = [
      {
        id: 'group_security',
        name: 'Sécurité',
        description: 'Appareils de sécurité',
        icon: '🔒',
        deviceIds: ['homekit_lock_1', 'alexa_camera_1', 'alexa_sensor_1'],
        type: 'security',
        location: 'global',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'group_lighting',
        name: 'Éclairage',
        description: 'Système d\'éclairage',
        icon: '💡',
        deviceIds: ['google_light_1', 'homekit_light_1'],
        type: 'lighting',
        location: 'indoor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'group_climate',
        name: 'Climat',
        description: 'Contrôle de la température',
        icon: '🌡️',
        deviceIds: ['google_thermostat_1'],
        type: 'climate',
        location: 'indoor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultGroups.forEach(group => this.groups.set(group.id, group));
  }

  public async setGroupState(groupId: string, state: Partial<Device>): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    try {
      // Appliquer l'état à tous les appareils du groupe en parallèle
      const statePromises = group.deviceIds.map(async (deviceId) => {
        try {
          await this.deviceService.setDeviceState(
            { id: deviceId } as Device,
            state
          );
        } catch (error) {
          console.error(`Error setting state for device ${deviceId}:`, error);
          throw error;
        }
      });

      await Promise.all(statePromises);
    } catch (error) {
      console.error(`Error setting group state for ${groupId}:`, error);
      throw error;
    }
  }

  public async getGroupState(groupId: string): Promise<Map<string, Partial<Device>>> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const deviceStates = new Map<string, Partial<Device>>();

    try {
      // Récupérer l'état de tous les appareils du groupe en parallèle
      const statePromises = group.deviceIds.map(async (deviceId) => {
        try {
          const state = await this.deviceService.getDeviceState({ id: deviceId } as Device);
          deviceStates.set(deviceId, state);
        } catch (error) {
          console.error(`Error getting state for device ${deviceId}:`, error);
          throw error;
        }
      });

      await Promise.all(statePromises);
      return deviceStates;
    } catch (error) {
      console.error(`Error getting group state for ${groupId}:`, error);
      throw error;
    }
  }

  public getGroup(groupId: string): DeviceGroup | undefined {
    return this.groups.get(groupId);
  }

  public getAllGroups(): DeviceGroup[] {
    return Array.from(this.groups.values());
  }

  public async createGroup(group: Omit<DeviceGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeviceGroup> {
    const newGroup: DeviceGroup = {
      ...group,
      id: `group_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.groups.set(newGroup.id, newGroup);
    return newGroup;
  }

  public async updateGroup(groupId: string, updates: Partial<DeviceGroup>): Promise<DeviceGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updatedGroup: DeviceGroup = {
      ...group,
      ...updates,
      id: group.id, // Empêcher la modification de l'ID
      updatedAt: new Date().toISOString()
    };

    this.groups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  public async deleteGroup(groupId: string): Promise<void> {
    if (!this.groups.has(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }

    this.groups.delete(groupId);
  }

  public async addDeviceToGroup(groupId: string, deviceId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    if (!group.deviceIds.includes(deviceId)) {
      group.deviceIds.push(deviceId);
      group.updatedAt = new Date().toISOString();
      this.groups.set(groupId, group);
    }
  }

  public async removeDeviceFromGroup(groupId: string, deviceId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const index = group.deviceIds.indexOf(deviceId);
    if (index !== -1) {
      group.deviceIds.splice(index, 1);
      group.updatedAt = new Date().toISOString();
      this.groups.set(groupId, group);
    }
  }

  public async getDeviceGroups(deviceId: string): Promise<DeviceGroup[]> {
    return Array.from(this.groups.values()).filter(group => 
      group.deviceIds.includes(deviceId)
    );
  }

  public async validateGroup(group: DeviceGroup): Promise<boolean> {
    try {
      // Vérifier que tous les appareils existent
      for (const deviceId of group.deviceIds) {
        const device = await this.deviceService.getDeviceState({ id: deviceId } as Device);
        if (!device) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
