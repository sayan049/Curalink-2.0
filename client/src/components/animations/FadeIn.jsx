import { motion } from 'framer-motion';
import { ANIMATION_VARIANTS } from '@/utils/constants';

const FadeIn = ({ children, delay = 0, className }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={ANIMATION_VARIANTS.fadeIn}
      transition={{ delay, duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;