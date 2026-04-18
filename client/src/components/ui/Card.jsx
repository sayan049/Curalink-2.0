import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

const Card = ({
  children,
  className,
  hover = true,
  onClick,
  padding = 'default',
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: '0 20px 40px rgba(14, 165, 233, 0.15)',
            }
          : {}
      }
      className={cn(
        'glass rounded-2xl border border-white/20 shadow-medical',
        'backdrop-blur-md bg-white/70',
        'transition-all duration-300',
        onClick && 'cursor-pointer',
        paddingClasses[padding],
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;