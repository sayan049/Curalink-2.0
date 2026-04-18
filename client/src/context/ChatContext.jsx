import { createContext, useContext, useState, useCallback } from 'react';
import useChatStore from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import useUIStore from '@/store/uiStore';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const {
    conversations,
    currentConversation,
    messages,
    setConversations,
    setCurrentConversation,
    setMessages,
    addMessage,
    setLoading,
    setSending,
  } = useChatStore();

  const { showToast } = useUIStore();
  const [initialized, setInitialized] = useState(false);

  const initialize = useCallback(async () => {
    if (initialized) return;

    setLoading(true);
    try {
      const response = await chatService.getConversations();
      setConversations(response.data);
      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  }, [initialized, setConversations, setLoading, showToast]);

  const loadConversation = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const response = await chatService.getConversation(id);
        setCurrentConversation(response.data.conversation);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        showToast('Failed to load conversation', 'error');
      } finally {
        setLoading(false);
      }
    },
    [setCurrentConversation, setMessages, setLoading, showToast]
  );

  const sendMessage = useCallback(
    async (content) => {
      if (!currentConversation) return;

      setSending(true);
      try {
        const response = await chatService.sendMessage(currentConversation._id, content);
        addMessage(response.data.userMessage);
        addMessage(response.data.assistantMessage);
      } catch (error) {
        console.error('Failed to send message:', error);
        showToast('Failed to send message', 'error');
      } finally {
        setSending(false);
      }
    },
    [currentConversation, addMessage, setSending, showToast]
  );

  const value = {
    conversations,
    currentConversation,
    messages,
    initialize,
    loadConversation,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};