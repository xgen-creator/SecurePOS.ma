import { EventEmitter } from 'events';

export interface SystemEvent {
  type: string;
  timestamp: Date;
  data: any;
  source: string;
}

export interface EventSubscriber {
  id: string;
  eventTypes: string[];
  callback: (event: SystemEvent) => void;
}

class EventService {
  private static instance: EventService;
  private emitter: EventEmitter;
  private subscribers: Map<string, EventSubscriber>;
  private eventHistory: SystemEvent[];
  private readonly MAX_HISTORY = 1000;

  private constructor() {
    this.emitter = new EventEmitter();
    this.subscribers = new Map();
    this.eventHistory = [];
    this.setupEventHandling();
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  private setupEventHandling(): void {
    this.emitter.setMaxListeners(50);
    
    // Gestion générique des événements
    this.emitter.on('*', (event: SystemEvent) => {
      this.addToHistory(event);
      this.notifySubscribers(event);
    });
  }

  public emit(eventType: string, data: any, source: string): void {
    const event: SystemEvent = {
      type: eventType,
      timestamp: new Date(),
      data,
      source
    };

    this.emitter.emit('*', event);
    this.emitter.emit(eventType, event);
  }

  public subscribe(subscriber: EventSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
    
    subscriber.eventTypes.forEach(eventType => {
      this.emitter.on(eventType, (event: SystemEvent) => {
        subscriber.callback(event);
      });
    });
  }

  public unsubscribe(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      subscriber.eventTypes.forEach(eventType => {
        this.emitter.removeListener(eventType, subscriber.callback);
      });
      this.subscribers.delete(subscriberId);
    }
  }

  private addToHistory(event: SystemEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }
  }

  private notifySubscribers(event: SystemEvent): void {
    this.subscribers.forEach(subscriber => {
      if (subscriber.eventTypes.includes(event.type) || subscriber.eventTypes.includes('*')) {
        subscriber.callback(event);
      }
    });
  }

  public getEventHistory(
    filter?: {
      startDate?: Date;
      endDate?: Date;
      types?: string[];
      source?: string;
    }
  ): SystemEvent[] {
    let filteredEvents = [...this.eventHistory];

    if (filter) {
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(event => 
          event.timestamp >= filter.startDate!
        );
      }

      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(event => 
          event.timestamp <= filter.endDate!
        );
      }

      if (filter.types && filter.types.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          filter.types!.includes(event.type)
        );
      }

      if (filter.source) {
        filteredEvents = filteredEvents.filter(event => 
          event.source === filter.source
        );
      }
    }

    return filteredEvents;
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventService = EventService.getInstance();
