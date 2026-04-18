import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { validateEmail } from '@/utils/helpers';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { showToast } = useUIStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      showToast('Password reset link sent to your email!', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" size="sm">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Check Your Email!</h3>
            
            <p className="text-slate-600 mb-2">
              We've sent a password reset link to:
            </p>
            
            <p className="font-semibold text-primary-600 mb-6">{email}</p>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-left mb-6">
              <p className="text-sm text-blue-800">
                <strong>📧 Check your inbox</strong> (and spam folder) for an email from Curalink. 
                Click the reset link in the email to set a new password.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                ⏱️ The link expires in 30 minutes.
              </p>
            </div>

            <Button onClick={handleClose} variant="secondary" className="w-full">
              Close
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-6">
              <p className="text-slate-600">
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl mb-4"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="your-email@example.com"
                icon={Mail}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                autoFocus
              />

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full text-sm text-slate-600 hover:text-primary-600 transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to login
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default ForgotPasswordModal;