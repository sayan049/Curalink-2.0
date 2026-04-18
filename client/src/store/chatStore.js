import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,

  // ✅ Per-conversation sending state
  sendingConversationId: null, // Track WHICH conversation is sending

  // ✅ Computed: is current conversation sending?
  get isSending() {
    const state = get();
    return state.sendingConversationId === state.currentConversation?._id;
  },

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  setCurrentConversation: (conversation) =>
    set({ currentConversation: conversation }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  deleteConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c._id !== conversationId),
      currentConversation:
        state.currentConversation?._id === conversationId
          ? null
          : state.currentConversation,
      messages:
        state.currentConversation?._id === conversationId
          ? []
          : state.messages,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  // ✅ Set which conversation is currently sending
  setSending: (conversationId) =>
    set({ sendingConversationId: conversationId }),

  // ✅ Clear sending state
  clearSending: () =>
    set({ sendingConversationId: null }),

  clearMessages: () => set({ messages: [] }),

  resetChat: () =>
    set({
      currentConversation: null,
      messages: [],
      isLoading: false,
      sendingConversationId: null,
    }),
}));

export default useChatStore;