
import dotenv from 'dotenv';
// Load env vars
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import connectDB from './config/db.js';
import redisClient from './config/redis.js';
import ollamaConfig from './config/ollama.js';
import { createEmailTransporter } from './config/email.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/api.js';



// Initialize Express app
const app = express();
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Connect to Redis
redisClient.connect().catch(err => {
  console.error('Redis connection failed, continuing without cache:', err.message);
});

// Check Ollama
ollamaConfig.checkHealth().catch(err => {
  console.error('Ollama health check failed:', err.message);
});

// Initialize email transporter
createEmailTransporter();

// ============================================
// CORS Configuration
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5001',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ============================================
// Body parser
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Simple sanitization middleware (removes $ and . from keys)
app.use((req, res, next) => {
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    }
    return obj;
  };

  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
});

// Prevent HTTP param pollution
app.use(hpp());

// Rate limiting
app.use('/api/', apiLimiter);

// API routes
app.use('/api/v1', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Curalink Medical AI Research Assistant API',
    version: '1.0.0',
    docs: '/api/v1',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🏥  CURALINK MEDICAL AI RESEARCH ASSISTANT');
  console.log('='.repeat(60));
  console.log(`🚀  Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api/v1`);
  console.log(`🔍  Health: http://localhost:${PORT}/health`);
  console.log(`🌐  Frontend: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(60) + '\n');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

export default app;