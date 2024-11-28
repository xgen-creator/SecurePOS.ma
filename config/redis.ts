import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

class RedisService {
  private client: Redis;
  private static instance: RedisService;

  private constructor() {
    this.client = new Redis(redisConfig);

    this.client.on('error', (error) => {
      console.error('Redis Error:', error);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('reconnecting', () => {
      console.log('Reconnecting to Redis...');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<'OK'> {
    return this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushdb(): Promise<'OK'> {
    return this.client.flushdb();
  }

  async quit(): Promise<'OK'> {
    return this.client.quit();
  }
}

export const redis = RedisService.getInstance();
