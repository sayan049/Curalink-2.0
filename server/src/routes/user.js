import express from 'express';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @desc    Get user statistics
// @route   GET /api/v1/user/stats
// @access  Private
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get conversation count
    const conversationCount = await Conversation.countDocuments({
      userId,
      isActive: true,
    });

    // Get all conversation IDs for this user
    const conversations = await Conversation.find({
      userId,
      isActive: true,
    }).select('_id metadata');

    const conversationIds = conversations.map(c => c._id);

    // Get total messages
    const messageCount = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      role: 'user', // Only count user messages
    });

    // ✅ Get REAL total publications and trials from conversation metadata
    let totalPublications = 0;
    let totalTrials = 0;

    conversations.forEach(conv => {
      totalPublications += conv.metadata?.totalPublications || 0;
      totalTrials += conv.metadata?.totalClinicalTrials || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        conversationCount,
        messageCount,
        totalPublications,
        totalTrials,
        memberSince: req.user.createdAt,
        lastActive: req.user.lastActive,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    next(error);
  }
});

// @desc    Get user activity
// @route   GET /api/v1/user/activity
// @access  Private
router.get('/activity', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const recentConversations = await Conversation.find({
      userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .select('title lastMessageAt metadata context.disease');

    res.status(200).json({
      success: true,
      data: recentConversations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;