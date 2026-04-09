import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { NotificationService } from './notification-service';
import { AuditService } from './audit-service';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning';
  state: any;
  location: string;
  protocol: 'zwave' | 'zigbee' | 'wifi' | 'matter';
  lastSeen: Date;
  firmware: string;
  manufacturer: string;
}

interface DeviceCommand {
  deviceId: string;
  command: string;
  parameters?: any;
}

interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
}

interface AutomationTrigger {
  type: 'schedule' | 'device' | 'event';
  config: any;
}

interface AutomationCondition {
  type: 'device' | 'time' | 'weather';
  config: any;
}

interface AutomationAction {
  type: 'device' | 'notification' | 'scene';
  config: any;
}

export class SmartHomeService extends EventEmitter {
  private static instance: SmartHomeService;
  private devices: Map<string, Device> = new Map();
  private automations: Map<string, Automation> = new Map();
  private deviceConnections: Map<string, any> = new Map();
  private wsServer: WebSocket.Server | null = null;

  private constructor() {
    super();
    this.initializeWebSocket();
  }

  static getInstance(): SmartHomeService {
    if (!SmartHomeService.instance) {
      SmartHomeService.instance = new SmartHomeService();
    }
    return SmartHomeService.instance;
  }

  private initializeWebSocket() {
    this.wsServer = new WebSocket.Server({ port: 8080 });

    this.wsServer.on('connection', (ws) => {
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleDeviceMessage(data);
        } catch (error) {
          console.error('Error handling device message:', error);
        }
      });
    });
  }

  private async handleDeviceMessage(message: any) {
    const device = this.devices.get(message.deviceId);
    if (!device) return;

    switch (message.type) {
      case 'status':
        await this.updateDeviceStatus(message.deviceId, message.status);
        break;
      case 'state':
        await this.updateDeviceState(message.deviceId, message.state);
        break;
      case 'alert':
        await this.handleDeviceAlert(message.deviceId, message.alert);
        break;
    }
  }

  async addDevice(deviceInfo: Partial<Device>): Promise<Device> {
    try {
      const device: Device = {
        id: deviceInfo.id || Date.now().toString(),
        name: deviceInfo.name || 'New Device',
        type: deviceInfo.type || 'unknown',
        status: 'offline',
        state: deviceInfo.state || {},
        location: deviceInfo.location || 'Unknown',
        protocol: deviceInfo.protocol || 'wifi',
        lastSeen: new Date(),
        firmware: deviceInfo.firmware || '1.0.0',
        manufacturer: deviceInfo.manufacturer || 'Unknown'
      };

      this.devices.set(device.id, device);

      await this.initializeDeviceConnection(device);

      await AuditService.logEvent({
        eventType: 'DEVICE_ADDED',
        details: {
          deviceId: device.id,
          deviceType: device.type,
          location: device.location
        }
      });

      return device;
    } catch (error) {
      console.error('Failed to add device:', error);
      throw error;
    }
  }

  private async initializeDeviceConnection(device: Device) {
    // Implement device-specific connection logic based on protocol
    switch (device.protocol) {
      case 'zwave':
        // Initialize Z-Wave connection
        break;
      case 'zigbee':
        // Initialize Zigbee connection
        break;
      case 'wifi':
        // Initialize WiFi connection
        break;
      case 'matter':
        // Initialize Matter connection
        break;
    }
  }

  async removeDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) return false;

      // Close device connection
      await this.closeDeviceConnection(deviceId);

      this.devices.delete(deviceId);

      await AuditService.logEvent({
        eventType: 'DEVICE_REMOVED',
        details: {
          deviceId,
          deviceType: device.type
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to remove device:', error);
      return false;
    }
  }

  private async closeDeviceConnection(deviceId: string) {
    const connection = this.deviceConnections.get(deviceId);
    if (connection) {
      // Implement connection cleanup logic
      this.deviceConnections.delete(deviceId);
    }
  }

  async sendCommand(command: DeviceCommand): Promise<boolean> {
    try {
      const device = this.devices.get(command.deviceId);
      if (!device) throw new Error('Device not found');

      // Send command to device
      await this.executeDeviceCommand(device, command);

      await AuditService.logEvent({
        eventType: 'DEVICE_COMMAND',
        details: {
          deviceId: command.deviceId,
          command: command.command,
          parameters: command.parameters
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  private async executeDeviceCommand(device: Device, command: DeviceCommand) {
    // Implement device-specific command execution
    const ws = this.wsServer?.clients.values().next().value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        deviceId: device.id,
        command: command.command,
        parameters: command.parameters
      }));
    }
  }

  async addAutomation(automation: Omit<Automation, 'id'>): Promise<Automation> {
    try {
      const newAutomation: Automation = {
        ...automation,
        id: Date.now().toString(),
        enabled: true
      };

      this.automations.set(newAutomation.id, newAutomation);

      await AuditService.logEvent({
        eventType: 'AUTOMATION_ADDED',
        details: {
          automationId: newAutomation.id,
          name: newAutomation.name
        }
      });

      return newAutomation;
    } catch (error) {
      console.error('Failed to add automation:', error);
      throw error;
    }
  }

  async updateAutomation(
    automationId: string,
    updates: Partial<Automation>
  ): Promise<Automation> {
    const automation = this.automations.get(automationId);
    if (!automation) throw new Error('Automation not found');

    const updatedAutomation = {
      ...automation,
      ...updates
    };

    this.automations.set(automationId, updatedAutomation);

    await AuditService.logEvent({
      eventType: 'AUTOMATION_UPDATED',
      details: {
        automationId,
        updates: Object.keys(updates)
      }
    });

    return updatedAutomation;
  }

  private async updateDeviceStatus(deviceId: string, status: string) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const previousStatus = device.status;
    device.status = status as any;
    device.lastSeen = new Date();

    if (previousStatus !== status) {
      await NotificationService.sendNotification({
        title: 'Device Status Change',
        message: `${device.name} is now ${status}`,
        type: status === 'offline' ? 'WARNING' : 'INFO',
        priority: status === 'offline' ? 'HIGH' : 'LOW',
        metadata: {
          deviceId,
          status
        }
      });
    }
  }

  private async updateDeviceState(deviceId: string, state: any) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.state = {
      ...device.state,
      ...state
    };

    this.emit('deviceStateChanged', {
      deviceId,
      state: device.state
    });
  }

  private async handleDeviceAlert(deviceId: string, alert: any) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    await NotificationService.sendNotification({
      title: 'Device Alert',
      message: `Alert from ${device.name}: ${alert.message}`,
      type: 'ALERT',
      priority: 'HIGH',
      metadata: {
        deviceId,
        alert
      }
    });
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getAutomations(): Promise<Automation[]> {
    return Array.from(this.automations.values());
  }

  async getDeviceState(deviceId: string): Promise<any> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');
    return device.state;
  }
}
