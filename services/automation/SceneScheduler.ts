import { Scene, SceneManager } from './SceneManager';
import { DeviceDiscoveryService } from '../devices/DeviceDiscoveryService';

export interface ScheduledScene {
  id: string;
  sceneId: string;
  name: string;
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'custom';
    time?: string; // HH:mm format
    days?: number[]; // 0-6 for Sunday-Saturday
    date?: string; // ISO date for one-time schedules
    customCron?: string; // For complex schedules
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export class SceneScheduler {
  private static instance: SceneScheduler;
  private schedules: Map<string, ScheduledScene> = new Map();
  private sceneManager: SceneManager;
  private deviceService: DeviceDiscoveryService;
  private schedulerInterval: NodeJS.Timer | null = null;

  private constructor() {
    this.sceneManager = SceneManager.getInstance();
    this.deviceService = DeviceDiscoveryService.getInstance();
    this.initializeDefaultSchedules();
    this.startScheduler();
  }

  public static getInstance(): SceneScheduler {
    if (!SceneScheduler.instance) {
      SceneScheduler.instance = new SceneScheduler();
    }
    return SceneScheduler.instance;
  }

  private initializeDefaultSchedules() {
    const defaultSchedules: ScheduledScene[] = [
      {
        id: 'schedule_morning',
        sceneId: 'scene_morning',
        name: 'Réveil automatique',
        schedule: {
          type: 'daily',
          time: '07:00'
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'schedule_night',
        sceneId: 'scene_night_mode',
        name: 'Mode nuit automatique',
        schedule: {
          type: 'daily',
          time: '22:30'
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'schedule_weekend_morning',
        sceneId: 'scene_morning',
        name: 'Réveil weekend',
        schedule: {
          type: 'weekly',
          time: '09:00',
          days: [0, 6] // Dimanche et Samedi
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultSchedules.forEach(schedule => this.schedules.set(schedule.id, schedule));
  }

  private startScheduler() {
    // Vérifier les planifications toutes les minutes
    this.schedulerInterval = setInterval(() => {
      this.checkSchedules();
    }, 60000);

    // Vérifier immédiatement au démarrage
    this.checkSchedules();
  }

  private async checkSchedules() {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      const shouldRun = this.shouldRunSchedule(schedule, now);
      if (shouldRun) {
        try {
          await this.sceneManager.activateScene(schedule.sceneId);
          
          // Mettre à jour les informations d'exécution
          schedule.lastRun = now.toISOString();
          schedule.nextRun = this.calculateNextRun(schedule, now).toISOString();
          schedule.updatedAt = now.toISOString();
          
          this.schedules.set(schedule.id, schedule);
        } catch (error) {
          console.error(`Error running scheduled scene ${schedule.sceneId}:`, error);
        }
      }
    }
  }

  private shouldRunSchedule(schedule: ScheduledScene, now: Date): boolean {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    switch (schedule.schedule.type) {
      case 'once':
        if (!schedule.schedule.date) return false;
        const scheduleDate = new Date(schedule.schedule.date);
        return scheduleDate.getTime() === now.getTime();

      case 'daily':
        if (!schedule.schedule.time) return false;
        const [hour, minute] = schedule.schedule.time.split(':').map(Number);
        return currentHour === hour && currentMinute === minute;

      case 'weekly':
        if (!schedule.schedule.time || !schedule.schedule.days) return false;
        const [weekHour, weekMinute] = schedule.schedule.time.split(':').map(Number);
        return (
          schedule.schedule.days.includes(currentDay) &&
          currentHour === weekHour &&
          currentMinute === weekMinute
        );

      case 'custom':
        if (!schedule.schedule.customCron) return false;
        // Implémenter la logique de cron personnalisée ici
        return false;

      default:
        return false;
    }
  }

  private calculateNextRun(schedule: ScheduledScene, from: Date): Date {
    const next = new Date(from);

    switch (schedule.schedule.type) {
      case 'once':
        if (!schedule.schedule.date) return next;
        return new Date(schedule.schedule.date);

      case 'daily':
        if (!schedule.schedule.time) return next;
        const [hour, minute] = schedule.schedule.time.split(':').map(Number);
        next.setHours(hour, minute, 0, 0);
        if (next <= from) {
          next.setDate(next.getDate() + 1);
        }
        return next;

      case 'weekly':
        if (!schedule.schedule.time || !schedule.schedule.days) return next;
        const [weekHour, weekMinute] = schedule.schedule.time.split(':').map(Number);
        next.setHours(weekHour, weekMinute, 0, 0);
        
        while (!schedule.schedule.days.includes(next.getDay()) || next <= from) {
          next.setDate(next.getDate() + 1);
        }
        return next;

      case 'custom':
        // Implémenter la logique de cron personnalisée ici
        return next;

      default:
        return next;
    }
  }

  public getSchedule(scheduleId: string): ScheduledScene | undefined {
    return this.schedules.get(scheduleId);
  }

  public getAllSchedules(): ScheduledScene[] {
    return Array.from(this.schedules.values());
  }

  public async createSchedule(schedule: Omit<ScheduledScene, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledScene> {
    const newSchedule: ScheduledScene = {
      ...schedule,
      id: `schedule_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculer la prochaine exécution
    newSchedule.nextRun = this.calculateNextRun(
      newSchedule,
      new Date()
    ).toISOString();

    this.schedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  public async updateSchedule(scheduleId: string, updates: Partial<ScheduledScene>): Promise<ScheduledScene> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const updatedSchedule: ScheduledScene = {
      ...schedule,
      ...updates,
      id: schedule.id,
      updatedAt: new Date().toISOString()
    };

    // Recalculer la prochaine exécution si nécessaire
    if (updates.schedule || updates.enabled !== undefined) {
      updatedSchedule.nextRun = this.calculateNextRun(
        updatedSchedule,
        new Date()
      ).toISOString();
    }

    this.schedules.set(scheduleId, updatedSchedule);
    return updatedSchedule;
  }

  public async deleteSchedule(scheduleId: string): Promise<void> {
    if (!this.schedules.has(scheduleId)) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    this.schedules.delete(scheduleId);
  }

  public async validateSchedule(schedule: ScheduledScene): Promise<boolean> {
    try {
      // Vérifier que la scène existe
      const scene = this.sceneManager.getScene(schedule.sceneId);
      if (!scene) {
        return false;
      }

      // Valider le format de l'horaire
      switch (schedule.schedule.type) {
        case 'once':
          if (!schedule.schedule.date) return false;
          if (isNaN(new Date(schedule.schedule.date).getTime())) return false;
          break;

        case 'daily':
          if (!schedule.schedule.time) return false;
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.schedule.time)) return false;
          break;

        case 'weekly':
          if (!schedule.schedule.time || !schedule.schedule.days) return false;
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.schedule.time)) return false;
          if (!schedule.schedule.days.every(day => day >= 0 && day <= 6)) return false;
          break;

        case 'custom':
          if (!schedule.schedule.customCron) return false;
          // Valider le format cron ici
          break;

        default:
          return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  public destroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }
}
