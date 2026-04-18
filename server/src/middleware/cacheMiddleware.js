import redisClient from '../config/redis.js';

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Generate unique cache key per user
    const userId = req.user?._id || 'anonymous';
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
      // ✅ Try to get from cache
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${req.originalUrl}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS: ${req.originalUrl}`);

      // ✅ Override res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        // Only cache successful responses
        if (body && body.success !== false) {
          try {
            await redisClient.set(key, body, duration);
            console.log(`💾 Cached: ${req.originalUrl} (TTL: ${duration}s)`);
          } catch (cacheError) {
            console.error('Cache set error:', cacheError.message);
          }
        }

        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next(); // On error, skip cache and continue
    }
  };
};