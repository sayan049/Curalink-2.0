import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import useUIStore from '@/store/uiStore';

const Toast = () => {
  const toast = useUIStore((state) => state.toast);
  const hideToast = useUIStore((state) => state.hideToast);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
    },
  };

  if (!toast) return null;

  const Icon = icons[toast.type] || icons.info;
  const colorScheme = colors[toast.type] || colors.info;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pointer-events-auto"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-2xl backdrop-blur-md min-w-[300px] max-w-md ${colorScheme.bg} ${colorScheme.border}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${colorScheme.icon}`} />
            <p className={`flex-1 text-sm font-medium ${colorScheme.text}`}>
              {toast.message}
            </p>
            <button
              onClick={hideToast}
              className={`p-1 hover:bg-white/50 rounded-lg transition-colors ${colorScheme.icon}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default Toast;