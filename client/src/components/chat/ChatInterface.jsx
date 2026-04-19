import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Sparkles,
  Search,
  BookOpen,
  FlaskConical,
  Brain,
  Zap,
  ArrowDown,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import InputArea from "./InputArea";
import useChatStore from "@/store/chatStore";

// ── Floating particle — desktop only ─────────────────────
const FloatingParticle = ({ delay, size, x, duration }) => (
  <motion.div
    className="absolute rounded-full bg-primary-300/20 hidden sm:block"
    style={{ width: size, height: size, left: `${x}%` }}
    animate={{ y: [0, -100, -200], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.3] }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeOut" }}
  />
);

// ── Stat pill ─────────────────────────────────────────────
const StatPill = ({ icon: Icon, value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", damping: 15 }}
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${color} backdrop-blur-sm`}
  >
    <Icon className="w-3 h-3 flex-shrink-0" />
    <span className="text-xs font-bold">{value}</span>
    <span className="text-xs opacity-70 hidden sm:inline">{label}</span>
  </motion.div>
);

// ── Scroll to bottom button ───────────────────────────────
const ScrollButton = ({ onClick, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={onClick}
        className="absolute bottom-24 sm:bottom-28 right-3 sm:right-6 z-10 p-2.5 sm:p-3 bg-white rounded-full shadow-xl border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all"
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="w-4 h-4 text-primary-600" />
      </motion.button>
    )}
  </AnimatePresence>
);

// ── Main ─────────────────────────────────────────────────
const ChatInterface = ({ onSendMessage }) => {
  const { messages, currentConversation, sendingConversationId } =
    useChatStore();

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isSendingHere = sendingConversationId === currentConversation?._id;

  const totalPubs = messages.reduce(
    (s, m) => s + (m.metadata?.publications?.length || 0),
    0,
  );
  const totalTrials = messages.reduce(
    (s, m) => s + (m.metadata?.clinicalTrials?.length || 0),
    0,
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSendingHere, scrollToBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const suggestions = [
    {
      icon: Search,
      text: `Latest treatments for ${currentConversation?.context?.disease || "diabetes"}`,
      color: "from-primary-500 to-primary-600",
    },
    {
      icon: FlaskConical,
      text: `Clinical trials ${
        currentConversation?.context?.location
          ? `in ${currentConversation.context.location}`
          : "near me"
      }`,
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Brain,
      text: `Top researchers in ${currentConversation?.context?.disease || "Alzheimer's"}`,
      color: "from-trust-500 to-trust-600",
    },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* ── Background ────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Blobs — smaller on mobile */}
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary-100/25 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-trust-100/25 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 bg-purple-100/15 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "5s" }}
        />
        {/* Particles — hidden on mobile via hidden sm:block inside component */}
        {[...Array(5)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 2}
            size={4 + i * 2}
            x={10 + i * 18}
            duration={8 + i * 2}
          />
        ))}
      </div>

      {/* ── Scroll area ───────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 sm:p-4 md:p-6 relative"
      >
        {/* ── Conversation banner ───────────────────────────── */}
        {currentConversation && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 sm:mb-5"
          >
            <div className="p-3 sm:p-4 bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-md">
              {/* Title + generating badge */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate flex-1 min-w-0">
                  {currentConversation.title}
                </h2>
                {isSendingHere && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
                  >
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="hidden sm:inline">Generating...</span>
                    <span className="sm:hidden">•••</span>
                  </motion.div>
                )}
              </div>

              {/* Disease + location tags */}
              {(currentConversation.context?.disease ||
                currentConversation.context?.location) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentConversation.context?.disease && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium border border-primary-200">
                      <Brain className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-[180px]">
                        {currentConversation.context.disease}
                      </span>
                    </span>
                  )}
                  {currentConversation.context?.location && (
                    <span className="inline-flex items-center gap-1 text-xs bg-trust-50 text-trust-700 px-2.5 py-1 rounded-full font-medium border border-trust-200">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[90px] sm:max-w-[160px]">
                        {currentConversation.context.location}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Stats row */}
              {messages.length > 0 && (totalPubs > 0 || totalTrials > 0) && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {totalPubs > 0 && (
                    <StatPill
                      icon={BookOpen}
                      value={totalPubs}
                      label="papers"
                      color="bg-blue-50/80 border-blue-200 text-blue-700"
                      delay={0.2}
                    />
                  )}
                  {totalTrials > 0 && (
                    <StatPill
                      icon={FlaskConical}
                      value={totalTrials}
                      label="trials"
                      color="bg-purple-50/80 border-purple-200 text-purple-700"
                      delay={0.3}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {messages.length === 0 && !isSendingHere && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center py-6 sm:py-10"
          >
            <div className="text-center w-full max-w-sm px-2">
              {/* Icon */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative mx-auto mb-5 sm:mb-7 w-18 h-18 sm:w-24 sm:h-24"
                style={{ width: 72, height: 72 }}
              >
                <div className="absolute inset-0 bg-primary-200 rounded-3xl blur-xl opacity-40" />
                <div className="relative w-full h-full bg-gradient-to-br from-primary-500 via-primary-600 to-trust-600 rounded-3xl flex items-center justify-center shadow-xl shadow-primary-500/25">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
              </motion.div>

              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                <span className="bg-gradient-to-r from-primary-600 via-trust-600 to-purple-600 bg-clip-text text-transparent">
                  Ready to Research
                </span>
              </h3>

              <p className="text-slate-500 mb-5 text-xs sm:text-sm leading-relaxed">
                Ask anything about medical research,
                <br className="hidden sm:block" />
                treatments, or clinical trials
              </p>

              {/* Location badge */}
              {currentConversation?.context?.location && (
                <div className="inline-flex items-center gap-1.5 text-xs text-trust-700 bg-trust-50 px-3 py-1.5 rounded-lg border border-trust-200 mb-4">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">
                    Near <strong>{currentConversation.context.location}</strong>
                  </span>
                </div>
              )}

              {/* Suggestion cards */}
              <div className="space-y-2">
                {suggestions.map((s, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSendMessage(s.text)}
                    className="w-full flex items-center gap-2.5 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-white transition-all text-left group"
                  >
                    <div
                      className={`flex-shrink-0 p-2 bg-gradient-to-r ${s.color} rounded-lg`}
                    >
                      <s.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="flex-1 min-w-0 text-xs sm:text-sm text-slate-700 font-medium line-clamp-1 group-hover:text-primary-700 transition-colors">
                      {s.text}
                    </span>
                    <Zap className="flex-shrink-0 w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 transition-colors" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Messages ──────────────────────────────────────── */}
        {(messages.length > 0 || isSendingHere) && (
          <>
            {messages.map((message, index) => (
              <motion.div
                key={message._id || index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  // ✅ only delay the last 3 messages max — not all of them
                  delay:
                    index >= messages.length - 3
                      ? (messages.length - 1 - index) * 0.06
                      : 0,
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

            <div ref={messagesEndRef} className="h-2" />
          </>
        )}
      </div>

      {/* ── Scroll button ─────────────────────────────────── */}
      <ScrollButton onClick={scrollToBottom} visible={showScrollBtn} />

      {/* ── Input ─────────────────────────────────────────── */}
      <div className="relative flex-shrink-0">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none" />
        <InputArea
          onSend={onSendMessage}
          disabled={isSendingHere}
          placeholder={
            isSendingHere
              ? "Generating response..."
              : currentConversation?.context?.location
                ? `Ask about ${currentConversation.context.disease || "medical research"} near ${currentConversation.context.location}...`
                : "Ask about medical research..."
          }
        />
      </div>
    </div>
  );
};

export default ChatInterface;
