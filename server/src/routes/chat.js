import express from 'express';
import {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/conversations')
  .get(cacheMiddleware(30), getConversations)  // ✅ Cache list for 30s only
  .post(createConversation);

router.route('/conversations/:id')
  .get(getConversation)       // ✅ NO CACHE - always fresh messages
  .delete(deleteConversation);

router.post('/conversations/:id/messages', chatLimiter, sendMessage);

export default router;