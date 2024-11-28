const ScanBellStructure = {
  // Composants Essentiels
  core: {
    tag: {
      types: ['QR', 'NFC'],
      features: ['message', 'appel', 'vidéo']
    },
    communication: {
      web: 'Sans installation',
      mobile: 'Application optionnelle'
    }
  },

  // Interfaces Principales
  interfaces: {
    visitor: {
      type: 'WebApp',
      features: ['scan', 'contact', 'status']
    },
    owner: {
      type: 'Mobile/Web App',
      features: ['gestion', 'notifications', 'paramètres']
    }
  }
};// Types de base
interface Tag {
  id: string;
  type: 'QR' | 'NFC';
  owner: string;
  settings: TagSettings;
}

interface TagSettings {
  availabilityHours: {
    start: string;
    end: string;
  };
  features: {
    message: boolean;
    audio: boolean;
    video: boolean;
  };
  autoReply: {
    enabled: boolean;
    message: string;
  };
}

interface Communication {
  type: 'message' | 'audio' | 'video';
  status: 'pending' | 'active' | 'ended';
  visitor: string;
  owner: string;
  timestamp: Date;
}import mongoose from 'mongoose';
import { config } from '../config';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(config.database.url, {
        dbName: config.database.name,
        user: config.database.user,
        pass: config.database.password,
        retryWrites: true,
        w: 'majority'
      });

      this.isConnected = true;
      console.log('Connected to MongoDB successfully');

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        this.isConnected = false;
        this.reconnect();
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    console.log('Attempting to reconnect to MongoDB...');
    try {
      await this.connect();
    } catch (error) {
      console.error('Failed to reconnect to MongoDB:', error);
      // Retry after 5 seconds
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }
}
