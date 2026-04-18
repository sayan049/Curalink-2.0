import { motion } from 'framer-motion';
import { Bot, Search, BookOpen, Brain } from 'lucide-react';

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 mb-6"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-trust-500 to-trust-600 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Loading Animation */}
      <div className="max-w-md">
        <p className="text-xs font-medium text-trust-600 mb-1">🤖 Curalink AI</p>

        <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm border border-primary-200 bg-primary-50/30">
          {/* Animated Steps */}
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-primary-700"
            >
              <Search className="w-3.5 h-3.5 animate-pulse" />
              <span>Searching PubMed, OpenAlex & ClinicalTrials.gov...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex items-center gap-2 text-xs text-trust-700"
            >
              <BookOpen className="w-3.5 h-3.5 animate-pulse" />
              <span>Ranking 400+ publications & trials...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5 }}
              className="flex items-center gap-2 text-xs text-purple-700"
            >
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span>Generating AI-powered insights...</span>
            </motion.div>
          </div>

          {/* Dots animation */}
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-primary-400 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;