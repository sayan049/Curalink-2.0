import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

const InputArea = ({ onSend, disabled, placeholder = 'Ask about medical research...' }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <motion.form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex items-end gap-3 p-3 rounded-2xl transition-all duration-300',
          'bg-white/80 backdrop-blur-xl border-2 shadow-lg',
          isFocused
            ? 'border-primary-400 shadow-primary-100/50 shadow-xl'
            : 'border-slate-200 shadow-sm',
          disabled && 'opacity-60'
        )}
      >
        {/* AI indicator */}
        <div className="flex-shrink-0 self-end mb-1">
          <motion.div
            animate={disabled ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center',
              disabled
                ? 'bg-yellow-100'
                : 'bg-gradient-to-r from-primary-100 to-trust-100'
            )}
          >
            <Sparkles className={cn(
              'w-4 h-4',
              disabled ? 'text-yellow-600' : 'text-primary-600'
            )} />
          </motion.div>
        </div>

        {/* Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-sm text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed py-1.5"
        />

        {/* Send button */}
        <motion.button
          type="submit"
          disabled={!message.trim() || disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 self-end',
            message.trim() && !disabled
              ? 'bg-gradient-to-r from-primary-500 to-trust-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </motion.form>

      {/* Tips */}
      <div className="flex items-center justify-between mt-2 px-2">
        <p className="text-xs text-slate-400">
          Press Enter to send
        </p>
        <p className="text-xs text-slate-400">
          Powered by LLaMA 3.1
        </p>
      </div>
    </div>
  );
};

export default InputArea;