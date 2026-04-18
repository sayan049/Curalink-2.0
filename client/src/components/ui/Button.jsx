import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-medical text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white text-primary-600 border-2 border-primary-200 hover:bg-primary-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg',
    success: 'bg-green-500 text-white hover:bg-green-600 shadow-lg',
    outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
        'focus:outline-none focus:ring-4 focus:ring-primary-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
    </motion.button>
  );
};

export default Button;