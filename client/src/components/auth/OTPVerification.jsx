import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { authService } from '@/services/authService';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import { useNavigate } from 'react-router-dom';

const OTPVerification = ({ email, isRegistration, userName = '' }) => {
  const { login } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      showToast('Please enter complete OTP', 'error');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isRegistration) {
        response = await authService.verifyRegistration({ email, otp: otpCode });
      } else {
        response = await authService.verifyLogin({ email, otp: otpCode });
      }

      login(response.user, response.token);
      showToast(
        isRegistration ? 'Registration successful!' : 'Login successful!',
        'success'
      );
      navigate('/dashboard');
    } catch (error) {
      showToast(error.response?.data?.message || 'Verification failed', 'error');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      if (isRegistration) {
        await authService.requestRegistrationOTP({ email, name: userName, password: '' });
      } else {
        await authService.requestLoginOTP({ email, password: '' });
      }
      showToast('New OTP sent to your email', 'success');
    } catch (error) {
      showToast('Failed to resend OTP', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold gradient-text mb-2">Verify Your Email</h3>
        <p className="text-slate-600">
          We've sent a 6-digit code to <span className="font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              whileFocus={{ scale: 1.05 }}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          ))}
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Verify OTP
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {resending ? 'Resending...' : "Didn't receive code? Resend"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default OTPVerification;