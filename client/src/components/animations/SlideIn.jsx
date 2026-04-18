import { motion } from 'framer-motion';
import { ANIMATION_VARIANTS } from '@/utils/constants';

const SlideIn = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  className 
}) => {
  const variants = {
    up: ANIMATION_VARIANTS.slideUp,
    down: ANIMATION_VARIANTS.slideDown,
    left: ANIMATION_VARIANTS.slideLeft,
    right: ANIMATION_VARIANTS.slideRight,
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants[direction]}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default SlideIn;