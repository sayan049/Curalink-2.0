import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className,
  animate = true,
}) => {
  const variants = {
    primary: 'bg-primary-100 text-primary-700 border-primary-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const Component = animate ? motion.span : 'span';
  const animationProps = animate
    ? {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring', damping: 15 },
      }
    : {};

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium border',
        'whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...animationProps}
    >
      {children}
    </Component>
  );
};

export default Badge;