import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';

export const chatService = {
  getConversations: async () => {
    const response = await api.get(API_ENDPOINTS.CONVERSATIONS);
    return response.data;
  },

  createConversation: async (data) => {
    const response = await api.post(API_ENDPOINTS.CONVERSATIONS, data);
    return response.data;
  },

  getConversation: async (id) => {
    const response = await api.get(API_ENDPOINTS.CONVERSATION_BY_ID(id));
    return response.data;
  },

  sendMessage: async (conversationId, content) => {
    const response = await api.post(API_ENDPOINTS.SEND_MESSAGE(conversationId), {
      content,
    });
    return response.data;
  },

  deleteConversation: async (id) => {
    const response = await api.delete(API_ENDPOINTS.CONVERSATION_BY_ID(id));
    return response.data;
  },
};