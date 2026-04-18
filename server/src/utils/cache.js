import redisClient from '../config/redis.js';

class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL_MEDIUM) || 1800; // 30 minutes
  }

  // Generate cache key
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  // Get from cache
  async get(key) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        console.log(`✅ Cache HIT: ${key}`);
        return data;
      }
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await redisClient.set(key, value, ttl);
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    try {
      await redisClient.del(key);
      console.log(`🗑️  Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Get or set pattern
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      let data = await this.get(key);

      if (data) {
        return data;
      }

      // Fetch fresh data
      console.log(`🔄 Fetching fresh data for: ${key}`);
      data = await fetchFunction();

      // Store in cache
      if (data) {
        await this.set(key, data, ttl);
      }

      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // If cache fails, still return fresh data
      return await fetchFunction();
    }
  }

  // Delete pattern (e.g., "user:123:*")
  async deletePattern(pattern) {
    try {
      const count = await redisClient.deletePattern(pattern);
      console.log(`🗑️  Deleted ${count} keys matching: ${pattern}`);
      return count;
    } catch (error) {
      console.error('Cache deletePattern error:', error);
      return 0;
    }
  }

  // Cache user data
  async cacheUserData(userId, data, ttl = 3600) {
    const key = this.generateKey('user', userId);
    return await this.set(key, data, ttl);
  }

  async getUserData(userId) {
    const key = this.generateKey('user', userId);
    return await this.get(key);
  }

  async invalidateUserCache(userId) {
    const pattern = `user:${userId}:*`;
    return await this.deletePattern(pattern);
  }

  // Cache conversation data
  async cacheConversation(conversationId, data, ttl = 1800) {
    const key = this.generateKey('conversation', conversationId);
    return await this.set(key, data, ttl);
  }

  async getConversation(conversationId) {
    const key = this.generateKey('conversation', conversationId);
    return await this.get(key);
  }

  // Cache search results
  async cacheSearchResults(query, disease, results, ttl = 3600) {
    const key = this.generateKey('search', query, disease || 'general');
    return await this.set(key, results, ttl);
  }

  async getSearchResults(query, disease) {
    const key = this.generateKey('search', query, disease || 'general');
    return await this.get(key);
  }

  // Batch operations
  async setMultiple(items, ttl = this.defaultTTL) {
    try {
      const promises = items.map(({ key, value }) => 
        this.set(key, value, ttl)
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }

  async getMultiple(keys) {
    try {
      const promises = keys.map(key => this.get(key));
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return [];
    }
  }

  // Cache statistics
  async getCacheStats() {
    try {
      const client = redisClient.getClient();
      const info = await client.info('stats');
      
      // Parse info string
      const stats = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        hits: parseInt(stats.keyspace_hits) || 0,
        misses: parseInt(stats.keyspace_misses) || 0,
        hitRate: stats.keyspace_hits && stats.keyspace_misses
          ? (parseInt(stats.keyspace_hits) / 
             (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2)
          : 0,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  // Flush all cache (use with caution)
  async flushAll() {
    try {
      const client = redisClient.getClient();
      await client.flushall();
      console.log('🗑️  All cache flushed');
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
}

export default new CacheService();