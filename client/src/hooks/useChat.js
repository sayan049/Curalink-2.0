import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '@/store/chatStore';
import { chatService } from '@/services/chatService';
import useUIStore from '@/store/uiStore';

const useChat = (conversationId) => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const sendingFromRef = useRef(null);
  const isFetchingRef = useRef(false);

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    sendingConversationId,
    setConversations,
    setCurrentConversation,
    setMessages,
    addMessage,
    addConversation,
    deleteConversation,
    setLoading,
    setSending,
    clearSending,
    clearMessages,
  } = useChatStore();

  const isSending = sendingConversationId === currentConversation?._id;

  // ✅ Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // ✅ Always fetch fresh messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
    } else {
      setCurrentConversation(null);
      clearMessages();
    }
  }, [conversationId]); // Re-runs every time URL changes

  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // ✅ Always fetch FRESH messages from server
  const fetchConversation = useCallback(async (id) => {
    // Don't fetch if we're currently sending FROM this conversation
    if (sendingFromRef.current === id) {
      console.log('⏳ Currently sending from this conversation - skipping fetch');
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current === id) {
      console.log('⏳ Already fetching this conversation');
      return;
    }

    isFetchingRef.current = id;
    setLoading(true);
    clearMessages();

    try {
      console.log(`📥 Fetching fresh messages for conversation: ${id}`);
      const response = await chatService.getConversation(id);

      // ✅ Only update if we're still on the same conversation
      if (isFetchingRef.current === id) {
        setCurrentConversation(response.data.conversation);
        setMessages(response.data.messages);
        console.log(`✅ Loaded ${response.data.messages.length} messages`);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      showToast('Failed to load conversation', 'error');
      navigate('/chat');
    } finally {
      if (isFetchingRef.current === id) {
        isFetchingRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  // ✅ Send message - with proper tracking
  const sendMessage = useCallback(async (content) => {
    if (!currentConversation) return;

    const targetConversationId = currentConversation._id;
    sendingFromRef.current = targetConversationId;

    // ✅ Add temp user message immediately
    const tempId = `temp-user-${Date.now()}`;
    const tempUserMessage = {
      _id: tempId,
      conversationId: targetConversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    addMessage(tempUserMessage);
    setSending(targetConversationId);

    try {
      const response = await chatService.sendMessage(targetConversationId, content);

      // ✅ Check if still on the SAME conversation
      const storeState = useChatStore.getState();
      const stillOnSameConversation =
        storeState.currentConversation?._id === targetConversationId;

      if (stillOnSameConversation) {
        // Replace temp message with real messages
        const currentMsgs = storeState.messages;
        const withoutTemp = currentMsgs.filter(m => m._id !== tempId);
        storeState.setMessages([
          ...withoutTemp,
          response.data.userMessage,
          response.data.assistantMessage,
        ]);
        console.log('✅ Response added to current conversation');
      } else {
        // ✅ User navigated away - messages saved in DB
        // They'll be loaded when user returns via fetchConversation
        console.log(`📝 User navigated away. Messages saved in DB for conversation ${targetConversationId}`);
      }

      // ✅ Refresh sidebar conversation list
      fetchConversations();

    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message. Please try again.', 'error');

      // Remove temp message on error
      const storeState = useChatStore.getState();
      if (storeState.currentConversation?._id === targetConversationId) {
        storeState.setMessages(
          storeState.messages.filter(m => m._id !== tempId)
        );
      }
    } finally {
      clearSending();
      sendingFromRef.current = null;
    }
  }, [currentConversation]);

  const createConversation = useCallback(async (data) => {
    try {
      const response = await chatService.createConversation(data);
      const newConversation = response.data;
      addConversation(newConversation);
      setCurrentConversation(newConversation);
      clearMessages();
      navigate(`/chat/${newConversation._id}`);
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      showToast('Failed to create conversation', 'error');
      return null;
    }
  }, []);

  const handleDeleteConversation = useCallback(async (convId) => {
    try {
      await chatService.deleteConversation(convId);
      deleteConversation(convId);
      showToast('Conversation deleted', 'success');
      if (currentConversation?._id === convId) {
        setCurrentConversation(null);
        clearMessages();
        navigate('/chat');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      showToast('Failed to delete conversation', 'error');
    }
  }, [currentConversation]);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    sendMessage,
    createConversation,
    deleteConversation: handleDeleteConversation,
    fetchConversations,
  };
};

export default useChat;