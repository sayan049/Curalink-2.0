import dotenv from 'dotenv';
// Load env vars
dotenv.config();
import Groq from 'groq-sdk';

class OllamaConfig {
  constructor() {
    // Initialize Groq client. It automatically uses process.env.GROQ_API_KEY
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY , 
    });
    
    // Switch to Groq's fast, free, intelligent Llama 3.1 model
    this.model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    this.timeout = parseInt(process.env.GROQ_TIMEOUT) || 120000;
    
    // Kept to prevent breaking existing code that calls getBaseURL()
    this.baseURL = 'https://api.groq.com/openai/v1'; 
  }

  async checkHealth() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️  GROQ_API_KEY is missing from environment variables.');
        return false;
      }

      // Send a tiny 1-token request to verify the API key is valid
      await this.client.chat.completions.create({
        messages: [{ role: "user", content: "ping" }],
        model: this.model,
        max_tokens: 1
      });

      console.log(`✅ AI model "${this.model}" is available and connected via Groq`);
      return true;
    } catch (error) {
      console.error('❌ Groq connection failed:', error.message);
      console.log('💡 Make sure your GROQ_API_KEY is correct in your .env file.');
      return false;
    }
  }

  // ✅ Kept to prevent breaking existing code. 
  // Groq is serverless and instantly available, so it doesn't actually need warming up.
  async warmupModel() {
    console.log('🔥 AI model is serverless; warmup skipped.');
    return Promise.resolve();
  }

  // ✅ Kept to prevent breaking existing code that expects an array of models.
  async listModels() {
    return [{ name: this.model }];
  }

  getBaseURL() { return this.baseURL; }
  getModel() { return this.model; }
  getTimeout() { return this.timeout; }
  
  // ✅ New method: Use this in your route handlers to actually generate text
  getClient() { return this.client; }
}

// Exported exactly as requested so your other files don't break!
const ollamaConfig = new OllamaConfig();
export default ollamaConfig;