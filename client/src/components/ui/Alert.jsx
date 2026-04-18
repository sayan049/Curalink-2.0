import { motion } from 'framer-motion';
import { Info, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const Alert = ({ type = 'info', title, message, className }) => {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      iconColor: 'text-green-600',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
    },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 p-4 rounded-xl border-2 ${bg} ${border} ${className}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1">
        {title && <p className={`font-semibold mb-1 ${text}`}>{title}</p>}
        {message && <p className={`text-sm ${text}`}>{message}</p>}
      </div>
    </motion.div>
  );
};

export default Alert;