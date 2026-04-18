import redisClient from '../../config/redis.js';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import llmService from '../ai/llmService.js';

class ContextManager {
  constructor() {
    this.contextTTL = parseInt(process.env.CACHE_TTL_MEDIUM) || 1800;
  }

  // ══════════════════════════════════════════════════════════
  // SAVE CONTEXT
  // ══════════════════════════════════════════════════════════
  async saveContext(userId, conversationId, context) {
    try {
      const key = `context:${userId}:${conversationId}`;
      await redisClient.set(key, context, this.contextTTL);
      console.log(`✅ Context saved for conversation ${conversationId}`);
    } catch (error) {
      console.error('Save context error:', error);
    }
  }

  // ══════════════════════════════════════════════════════════
  // GET CONTEXT (Redis → MongoDB fallback)
  // ══════════════════════════════════════════════════════════
  async getContext(userId, conversationId) {
    try {
      const key = `context:${userId}:${conversationId}`;
      let context = await redisClient.get(key);

      if (context) {
        console.log('✅ Context retrieved from Redis');
        return context;
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });

      if (conversation) {
        context = conversation.context;
        await this.saveContext(userId, conversationId, context);
        console.log('✅ Context retrieved from MongoDB');
        return context;
      }

      return null;
    } catch (error) {
      console.error('Get context error:', error);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // UPDATE CONTEXT
  // ══════════════════════════════════════════════════════════
  async updateContext(userId, conversationId, updates) {
    try {
      const currentContext =
        (await this.getContext(userId, conversationId)) || {};

      const newContext = {
        ...currentContext,
        ...updates,
        lastUpdated: new Date(),
      };

      await this.saveContext(userId, conversationId, newContext);

      await Conversation.findByIdAndUpdate(
        conversationId,
        {
          context: newContext,
          lastMessageAt: new Date(),
        },
        { returnDocument: 'after' }
      );

      console.log(`✅ Context updated for conversation ${conversationId}`);
      return newContext;
    } catch (error) {
      console.error('Update context error:', error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════
  // LOCATION EXTRACTION FROM MESSAGE
  // ══════════════════════════════════════════════════════════
  extractLocationFromMessage(text) {
    const excludeWords = [
      'alzheimer', 'parkinson', 'diabetes', 'cancer', 'disease',
      'treatment', 'therapy', 'research', 'study', 'trial',
      'clinical', 'medical', 'health', 'patient', 'drug',
      'vitamin', 'protein', 'gene', 'cell', 'brain',
      'heart', 'lung', 'liver', 'kidney', 'blood',
      'syndrome', 'disorder', 'infection', 'virus', 'bacteria',
    ];

    const locationPatterns = [
      /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*,\s*[A-Z][a-zA-Z\s]+)/g,
      /\bnear\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
      /\blocated\s+in\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
    ];

    for (const pattern of locationPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const location = match[1].trim();
        const locationLower = location.toLowerCase();
        const isExcluded = excludeWords.some(word =>
          locationLower.includes(word)
        );
        if (!isExcluded && location.length > 2 && location.length < 50) {
          return location;
        }
      }
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════
  // EXTRACT ENTITIES + UPDATE CONTEXT
  // ══════════════════════════════════════════════════════════
async extractAndUpdateContext(userId, conversationId, userMessage) {
  try {
    let entities = {
      diseases: [], symptoms: [], treatments: [], medications: [], procedures: [],
    };

    try {
      entities = await llmService.extractEntities(userMessage);
    } catch (extractError) {
      console.error('Entity extraction failed:', extractError.message);
    }

    const detectedLocation = this.extractLocationFromMessage(userMessage);
    const currentContext   = (await this.getContext(userId, conversationId)) || {};
    const currentEntities  = currentContext.entities || {};
    const safeArr          = (arr) => (Array.isArray(arr) ? arr : []);

    const updatedEntities = {
      diseases:   [...new Set([...safeArr(currentEntities.diseases),   ...safeArr(entities.diseases)])],
      treatments: [...new Set([...safeArr(currentEntities.treatments), ...safeArr(entities.treatments)])],
      symptoms:   [...new Set([...safeArr(currentEntities.symptoms),   ...safeArr(entities.symptoms)])],
      medications:[...new Set([...safeArr(currentEntities.medications),...safeArr(entities.medications)])],
      procedures: [...new Set([...safeArr(currentEntities.procedures), ...safeArr(entities.procedures)])],
    };

    const previousQueries = safeArr(currentContext.previousQueries);
    previousQueries.push(userMessage);
    const recentQueries = previousQueries.slice(-10);

    let disease  = currentContext.disease;
    let location = currentContext.location;

    if (!disease && safeArr(entities.diseases).length > 0) {
      disease = entities.diseases[0];
      console.log(`🔬 Disease detected: ${disease}`);
    }
    if (detectedLocation) {
      location = detectedLocation;
      console.log(`📍 Location detected: ${location}`);
    }

    const contextUpdate = {
      entities:         updatedEntities,
      previousQueries:  recentQueries,
      disease:          disease   || currentContext.disease   || null,
      location:         location  || currentContext.location  || null,
      // ✅ Preserve responseEntities across turns — only controller resets them
      responseEntities: safeArr(currentContext.responseEntities),
      lastUpdated:      new Date(),
    };

    await this.updateContext(userId, conversationId, contextUpdate);

    return { entities: updatedEntities, previousQueries: recentQueries, location, disease };
  } catch (error) {
    console.error('Extract and update context error:', error);
    return null;
  }
}

  // ══════════════════════════════════════════════════════════
  // BUILD CONTEXT SUMMARY (used for logging/debug)
  // ══════════════════════════════════════════════════════════
  async buildContextSummary(userId, conversationId) {
    try {
      const context = await this.getContext(userId, conversationId);
      if (!context) return 'No previous context';

      const parts = [];
      const safeArr = (arr) => (Array.isArray(arr) ? arr : []);

      if (context.disease)  parts.push(`Primary Condition: ${context.disease}`);
      if (context.location) parts.push(`Location: ${context.location}`);

      if (context.entities) {
        const { diseases, treatments, symptoms, medications } = context.entities;
        if (safeArr(diseases).length    > 0) parts.push(`Conditions: ${diseases.slice(0, 5).join(', ')}`);
        if (safeArr(treatments).length  > 0) parts.push(`Treatments: ${treatments.slice(0, 5).join(', ')}`);
        if (safeArr(symptoms).length    > 0) parts.push(`Symptoms: ${symptoms.slice(0, 5).join(', ')}`);
        if (safeArr(medications).length > 0) parts.push(`Medications: ${medications.slice(0, 3).join(', ')}`);
      }

      if (safeArr(context.previousQueries).length > 0) {
        parts.push(
          `Recent Topics: ${context.previousQueries.slice(-3).join('; ')}`
        );
      }

      return parts.join(' | ') || 'General medical inquiry';
    } catch (error) {
      console.error('Build context summary error:', error);
      return 'General medical inquiry';
    }
  }

  // ══════════════════════════════════════════════════════════
  // GET CONVERSATION HISTORY — sanitized for LLM consumption
  // ══════════════════════════════════════════════════════════
async getConversationHistory(conversationId, limit = 10) {
  try {
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('role content createdAt metadata')
      .lean();

    const ordered = messages.reverse();

    return ordered.map(msg => {
      if (msg.role === 'user') {
        return {
          role:    'user',
          // ✅ 300 chars (was 200) — matches buildChatMessages window
          content: String(msg.content || '').substring(0, 300),
        };
      }

      // Assistant: use conditionOverview + first keyFinding for richer context
      const structured = msg.metadata?.structuredResponse;
      let summary      = '';

      if (structured?.conditionOverview) {
        summary = String(structured.conditionOverview).substring(0, 200);

        // ✅ Append first key finding so "the first treatment" has a referent
        const firstFinding = Array.isArray(structured.keyFindings) &&
          structured.keyFindings.length > 0
            ? String(structured.keyFindings[0]).substring(0, 100)
            : '';

        if (firstFinding) summary += ` Key: ${firstFinding}`;

      } else if (typeof msg.content === 'string' && msg.content.trim()) {
        const trimmed = msg.content.trim();
        summary = (trimmed.startsWith('{') || trimmed.startsWith('['))
          ? 'Medical research summary provided.'
          : trimmed.substring(0, 200);
      } else {
        summary = 'Medical research summary provided.';
      }

      return {
        role:    'assistant',
        // ✅ 300 chars total (was 150)
        content: summary.substring(0, 300),
      };
    });
  } catch (error) {
    console.error('Get conversation history error:', error);
    return [];
  }
}


  // ══════════════════════════════════════════════════════════
  // CLEAR CONTEXT (on topic switch or conversation delete)
  // ══════════════════════════════════════════════════════════
  async clearContext(userId, conversationId) {
    try {
      const key = `context:${userId}:${conversationId}`;
      await redisClient.del(key);
      console.log(`✅ Context cleared for conversation ${conversationId}`);
    } catch (error) {
      console.error('Clear context error:', error);
    }
  }
}

export default new ContextManager();