import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/helpers';

const Avatar = ({ 
  src, 
  name, 
  size = 'md', 
  className,
  showBorder = false,
  status,
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-slate-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };

  const statusSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
  };

  return (
    <div className="relative inline-block">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full overflow-hidden',
          'bg-gradient-medical text-white font-semibold',
          showBorder && 'ring-2 ring-white ring-offset-2',
          sizes[size],
          className
        )}
      >
        {src ? (
          <img 
            src={src} 
            alt={name || 'Avatar'} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
        
        {/* Fallback if image fails */}
        {src && (
          <div className="absolute inset-0 hidden items-center justify-center bg-gradient-medical text-white">
            <span>{name ? getInitials(name) : <User className="w-1/2 h-1/2" />}</span>
          </div>
        )}
      </motion.div>

      {/* Status Indicator */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            statusColors[status],
            statusSize[size]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;