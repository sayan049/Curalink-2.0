import dotenv from 'dotenv';
// Load env vars
dotenv.config();
import Redis from 'ioredis';

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      // Production: Upstash URL
      const redisUrl = process.env.REDIS_URL;

      const redisOptions = {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        lazyConnect: false,
      };

      if (redisUrl) {
        this.client = new Redis(redisUrl, redisOptions);
      } else {
        // Development: Localhost fallback
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          ...redisOptions
        });
      }

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis ready');
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
      });

      this.client.on('close', () => {
        console.warn('⚠️  Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      return null;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('Redis connection closed');
    }
  }

  // Cache helper methods (Unchanged)
  async get(key) {
    try {
      if (!this.client) return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.client) return false;
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.client) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.client) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      if (!this.client) return 0;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for ${pattern}:`, error.message);
      return 0;
    }
  }

  async hset(key, field, value) {
    try {
      if (!this.client) return false;
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis HSET error:`, error.message);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.client) return null;
      const data = await this.client.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis HGET error:`, error.message);
      return null;
    }
  }

  async hgetall(key) {
    try {
      if (!this.client) return {};
      const data = await this.client.hgetall(key);
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    } catch (error) {
      console.error(`Redis HGETALL error:`, error.message);
      return {};
    }
  }
}

// ✅ Create single instance
const redisClient = new RedisClient();

// ✅ Export as BOTH default AND named
export default redisClient;      
export { redisClient as client };