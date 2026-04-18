import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, MapPin, Sparkles, Search,
  BookOpen, FlaskConical, Brain, Zap,
  ArrowDown
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import InputArea from './InputArea';
import useChatStore from '@/store/chatStore';

// ✅ Floating particle animation
const FloatingParticle = ({ delay, size, x, duration }) => (
  <motion.div
    className="absolute rounded-full bg-primary-300/20"
    style={{ width: size, height: size, left: `${x}%` }}
    animate={{
      y: [0, -100, -200],
      opacity: [0, 0.6, 0],
      scale: [0.5, 1, 0.3],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
    }}
  />
);

// ✅ Animated stats mini card
const StatPill = ({ icon: Icon, value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', damping: 15 }}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${color} backdrop-blur-sm`}
  >
    <Icon className="w-3.5 h-3.5" />
    <span className="text-xs font-bold">{value}</span>
    <span className="text-xs opacity-70">{label}</span>
  </motion.div>
);

// ✅ Scroll to bottom button
const ScrollButton = ({ onClick, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={onClick}
        className="absolute bottom-28 right-6 z-10 p-3 bg-white rounded-full shadow-xl border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all group"
      >
        <ArrowDown className="w-4 h-4 text-primary-600 group-hover:animate-bounce" />
      </motion.button>
    )}
  </AnimatePresence>
);

const ChatInterface = ({ onSendMessage, onToggleSidebar, sidebarOpen }) => {
  const {
    messages,
    currentConversation,
    sendingConversationId,
  } = useChatStore();

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isSendingHere = sendingConversationId === currentConversation?._id;

  // Count stats
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const aiMsgCount = messages.filter(m => m.role === 'assistant').length;
  const totalPubs = messages.reduce((s, m) => s + (m.metadata?.publications?.length || 0), 0);
  const totalTrials = messages.reduce((s, m) => s + (m.metadata?.clinicalTrials?.length || 0), 0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSendingHere]);

  // Detect scroll position for scroll-to-bottom button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* ✅ Animated background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-trust-100/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-100/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '5s' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 2}
            size={4 + i * 2}
            x={10 + i * 15}
            duration={8 + i * 2}
          />
        ))}
      </div>

      {/* ✅ Messages Area with scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative"
      >
        {/* ✅ Conversation info banner */}
        {currentConversation && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="p-4 bg-white/70 backdrop-blur-xl rounded-2xl  border-white/40 shadow-lg">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-bold text-slate-900 truncate"
                  >
                    {currentConversation.title}
                  </motion.h2>
                </div>
                {isSendingHere && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"
                  >
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    Generating...
                  </motion.div>
                )}
              </div>

              {/* Tags + Stats row */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentConversation.context?.disease && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-primary-100 to-primary-50 text-primary-800 px-3 py-1.5 rounded-full font-medium border border-primary-200"
                  >
                    <Brain className="w-3 h-3" />
                    {currentConversation.context.disease}
                  </motion.span>
                )}
                {currentConversation.context?.location && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-trust-100 to-trust-50 text-trust-800 px-3 py-1.5 rounded-full font-medium border border-trust-200"
                  >
                    <MapPin className="w-3 h-3" />
                    {currentConversation.context.location}
                  </motion.span>
                )}

                {/* Mini stats - only show when messages exist */}
                {messages.length > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    {totalPubs > 0 && (
                      <StatPill
                        icon={BookOpen}
                        value={totalPubs}
                        label="papers"
                        color="bg-blue-50/80 border-blue-200 text-blue-700"
                        delay={0.3}
                      />
                    )}
                    {totalTrials > 0 && (
                      <StatPill
                        icon={FlaskConical}
                        value={totalTrials}
                        label="trials"
                        color="bg-purple-50/80 border-purple-200 text-purple-700"
                        delay={0.4}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ✅ Empty state with animated graphics */}
        {messages.length === 0 && !isSendingHere ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="h-[calc(100%-8rem)] flex items-center justify-center"
          >
            <div className="text-center max-w-lg">
              {/* Animated icon */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotateZ: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative mx-auto mb-8 w-28 h-28"
              >
                {/* Glowing rings */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-primary-200 rounded-3xl blur-xl"
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  className="absolute -inset-4 bg-trust-200 rounded-3xl blur-2xl"
                />

                {/* Main icon */}
                <div className="relative w-full h-full bg-gradient-to-br from-primary-500 via-primary-600 to-trust-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/30">
                  <Sparkles className="w-14 h-14 text-white" />
                </div>

                {/* Orbiting dots */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay: i * 2 }}
                    className="absolute inset-0"
                  >
                    <div
                      className="absolute w-3 h-3 bg-trust-400 rounded-full shadow-lg"
                      style={{ top: -6, left: '50%', marginLeft: -6 }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold mb-3"
              >
                <span className="bg-gradient-to-r from-primary-600 via-trust-600 to-purple-600 bg-clip-text text-transparent">
                  Ready to Research
                </span>
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-slate-500 mb-8 text-base"
              >
                Ask anything about medical research, treatments, or clinical trials
              </motion.p>

              {/* Location indicator */}
              {currentConversation?.context?.location && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 text-sm text-trust-700 bg-trust-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-trust-200 mb-6"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Searching near <strong>{currentConversation.context.location}</strong></span>
                </motion.div>
              )}

              {/* Suggestion cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                {[
                  {
                    icon: Search,
                    text: `Latest treatments for ${currentConversation?.context?.disease || 'diabetes'}`,
                    color: 'from-primary-500 to-primary-600',
                  },
                  {
                    icon: FlaskConical,
                    text: `Clinical trials ${currentConversation?.context?.location ? `in ${currentConversation.context.location}` : 'near me'}`,
                    color: 'from-purple-500 to-purple-600',
                  },
                  {
                    icon: Brain,
                    text: `Top researchers in ${currentConversation?.context?.disease || "Alzheimer's"}`,
                    color: 'from-trust-500 to-trust-600',
                  },
                ].map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSendMessage(suggestion.text)}
                    className="w-full flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-white/90 transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <div className={`p-2.5 bg-gradient-to-r ${suggestion.color} rounded-xl flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <suggestion.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-slate-700 font-medium group-hover:text-primary-700 transition-colors">
                      {suggestion.text}
                    </span>
                    <Zap className="w-4 h-4 text-slate-300 group-hover:text-primary-500 ml-auto transition-colors" />
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ✅ Messages with staggered animation */}
            {messages.map((message, index) => (
              <motion.div
                key={message._id || index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(index * 0.05, 0.3),
                }}
              >
                <MessageBubble
                  message={message}
                  isLast={index === messages.length - 1}
                />
              </motion.div>
            ))}

            <AnimatePresence>
              {isSendingHere && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ✅ Scroll to bottom button */}
      <ScrollButton onClick={scrollToBottom} visible={showScrollBtn} />

      {/* ✅ Input area with glass effect */}
      <div className="relative">
        {/* Fade gradient above input */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />

        <InputArea
          onSend={onSendMessage}
          disabled={isSendingHere}
          placeholder={
            isSendingHere
              ? 'Generating response...'
              : currentConversation?.context?.location
              ? `Ask about ${currentConversation.context.disease || 'medical research'} near ${currentConversation.context.location}...`
              : 'Ask about medical research...'
          }
        />
      </div>
    </div>
  );
};

export default ChatInterface;