import mongoose from 'mongoose';

const publicationSchema = new mongoose.Schema({
  id: String,
  title: { type: String, required: true },
  abstract: String,
  authors: [String],
  year: Number,
  source: { type: String, enum: ['pubmed', 'openalex'], required: true },
  url: { type: String, required: true },
  doi: String,
  citationCount: Number,
  journalName: String,
  relevanceScore: { type: Number }, // ✅ REMOVED min/max - allow any number
  keyFindings: [String],
}, { _id: false });

const clinicalTrialSchema = new mongoose.Schema({
  id: String,
  nctId: String,
  title: { type: String, required: true },
  status: String,
  phase: String,
  conditions: [String],
  interventions: [String],
  eligibility: String,
  locations: [String],
  contact: {
    name: String,
    email: String,
    phone: String,
  },
  url: { type: String, required: true },
  relevanceScore: { type: Number }, // ✅ REMOVED min/max - allow any number
  startDate: String,
  completionDate: String,
  enrollmentCount: Number,
  sponsor: String,
}, { _id: false });

const structuredResponseSchema = new mongoose.Schema({
  conditionOverview: String,
  keyFindings: [String],
  researchInsights: String,
  clinicalTrialsSummary: String, // ✅ Keep as String
  recommendations: [String],
  safetyConsiderations: [String],
  references: {
    publicationCount: Number,
    trialCount: Number,
    dateRange: String,
  },
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      publications: [publicationSchema],
      clinicalTrials: [clinicalTrialSchema],
      structuredResponse: structuredResponseSchema,
      queryExpansion: String,
      originalQuery: String,
      processingTime: Number,
      tokensUsed: Number,
      modelUsed: String,
      searchStrategy: String,
      cacheHit: { type: Boolean, default: false },
    },
    isStreaming: {
      type: Boolean,
      default: false,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'urgent'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient message retrieval
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, role: 1 });

// Method to get publications count
messageSchema.methods.getPublicationsCount = function () {
  return this.metadata?.publications?.length || 0;
};

// Method to get clinical trials count
messageSchema.methods.getClinicalTrialsCount = function () {
  return this.metadata?.clinicalTrials?.length || 0;
};

// Method to check if message has research data
messageSchema.methods.hasResearchData = function () {
  return (
    (this.metadata?.publications && this.metadata.publications.length > 0) ||
    (this.metadata?.clinicalTrials && this.metadata.clinicalTrials.length > 0)
  );
};

// Static method to get conversation history
messageSchema.statics.getConversationHistory = async function (conversationId, limit = 20) {
  return this.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-metadata.publications.abstract -metadata.clinicalTrials.eligibility');
};

// Static method to get messages with research data
messageSchema.statics.getMessagesWithResearch = async function (conversationId) {
  return this.find({
    conversationId,
    $or: [
      { 'metadata.publications.0': { $exists: true } },
      { 'metadata.clinicalTrials.0': { $exists: true } },
    ],
  });
};

const Message = mongoose.model('Message', messageSchema);

export default Message;