import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'New Conversation',
    },
    context: {
      disease: String,
      normalizedDisease: String,
      intent: String,
      location: String,
      entities: {
        diseases: [String],
        treatments: [String],
        symptoms: [String],
        medications: [String],
        procedures: [String],
      },
      previousQueries: {
        type: [String],
        default: [],
      },
      aggregatedContext: String,
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    metadata: {
      totalPublications: { type: Number, default: 0 },
      totalClinicalTrials: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      messageCount: { type: Number, default: 0 },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for messages
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
});

// Indexes for efficient queries
conversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, isPinned: -1, lastMessageAt: -1 });
conversationSchema.index({ 'context.disease': 1 });

// Update context method
conversationSchema.methods.updateContext = function (newContext) {
  this.context = {
    ...this.context,
    ...newContext,
    lastUpdated: new Date(),
  };
  
  this.context.aggregatedContext = this.generateAggregatedContext();
  
  return this.save();
};

// Generate aggregated context for LLM
conversationSchema.methods.generateAggregatedContext = function () {
  const parts = [];
  
  if (this.context.disease) {
    parts.push(`Disease: ${this.context.disease}`);
  }
  
  if (this.context.location) {
    parts.push(`Location: ${this.context.location}`);
  }
  
  if (this.context.entities) {
    const { diseases, treatments, symptoms, medications } = this.context.entities;
    
    if (diseases && diseases.length > 0) {
      parts.push(`Related Conditions: ${diseases.join(', ')}`);
    }
    
    if (treatments && treatments.length > 0) {
      parts.push(`Treatments Discussed: ${treatments.join(', ')}`);
    }
    
    if (symptoms && symptoms.length > 0) {
      parts.push(`Symptoms: ${symptoms.join(', ')}`);
    }
    
    if (medications && medications.length > 0) {
      parts.push(`Medications: ${medications.join(', ')}`);
    }
  }
  
  if (this.context.previousQueries && this.context.previousQueries.length > 0) {
    parts.push(`Previous Topics: ${this.context.previousQueries.slice(-3).join('; ')}`);
  }
  
  return parts.join(' | ');
};

// Auto-generate title from first message
conversationSchema.methods.generateTitle = function (firstQuery) {
  if (firstQuery.length <= 50) {
    this.title = firstQuery;
  } else {
    this.title = firstQuery.substring(0, 47) + '...';
  }
  return this.save();
};

// Update metadata
conversationSchema.methods.updateMetadata = function (updates) {
  this.metadata = { ...this.metadata, ...updates };
  return this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;