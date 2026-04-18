// Simple console logger (can be extended with Winston)
const logger = {
  info: (...args) => {
    console.log('ℹ️ ', ...args);
  },
  error: (...args) => {
    console.error('❌', ...args);
  },
  warn: (...args) => {
    console.warn('⚠️ ', ...args);
  },
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛', ...args);
    }
  },
  success: (...args) => {
    console.log('✅', ...args);
  },
};

export default logger;