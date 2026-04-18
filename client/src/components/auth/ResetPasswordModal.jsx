import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { getPasswordStrength } from '@/utils/helpers';

const ResetPasswordModal = ({ isOpen, onClose, token }) => {
  const { showToast } = useUIStore();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const passwordStrength = getPasswordStrength(formData.password);

  // Verify token on mount
  useEffect(() => {
    if (token && isOpen) {
      verifyToken();
    }
  }, [token, isOpen]);

  const verifyToken = async () => {
    setVerifying(true);
    try {
      const response = await authService.verifyResetToken(token);
      setTokenValid(true);
      setUserEmail(response.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired reset link');
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.password) {
      setError('Please enter a new password');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, formData.password, formData.confirmPassword);
      setSuccess(true);
      showToast('Password reset successfully!', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ password: '', confirmPassword: '' });
    setError('');
    setSuccess(false);
    setLoading(false);
    setVerifying(true);
    setTokenValid(false);
    onClose();
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Set New Password" size="sm">
      <AnimatePresence mode="wait">
        {/* Loading - Verifying Token */}
        {verifying && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Verifying reset link...</p>
          </motion.div>
        )}

        {/* Invalid Token */}
        {!verifying && !tokenValid && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Invalid Reset Link</h3>
            <p className="text-slate-600 mb-6">{error || 'This reset link is invalid or has expired.'}</p>
            <Button onClick={handleClose} variant="secondary" className="w-full">
              Close
            </Button>
          </motion.div>
        )}

        {/* Success */}
        {!verifying && success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Password Reset!</h3>
            <p className="text-slate-600 mb-6">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            <Button onClick={handleClose} className="w-full">
              Go to Login
            </Button>
          </motion.div>
        )}

        {/* Reset Form */}
        {!verifying && tokenValid && !success && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-4">
              <p className="text-slate-600">
                Enter your new password for <strong className="text-primary-600">{userEmail}</strong>
              </p>
            </div>

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
              {/* New Password */}
              <div className="relative">
                <Input
                  label="New Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[42px] text-slate-400 hover:text-slate-600 z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength.percentage}%` }}
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.strength === 'weak' ? 'bg-red-500' :
                          passwordStrength.strength === 'fair' ? 'bg-orange-500' :
                          passwordStrength.strength === 'good' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength === 'weak' ? 'text-red-600' :
                      passwordStrength.strength === 'fair' ? 'text-orange-600' :
                      passwordStrength.strength === 'good' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.strength}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-[42px] text-slate-400 hover:text-slate-600 z-10"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Match indicator */}
              {formData.confirmPassword && (
                <p className={`text-xs ${
                  formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formData.password === formData.confirmPassword ? '✅ Passwords match' : '❌ Passwords do not match'}
                </p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default ResetPasswordModal;