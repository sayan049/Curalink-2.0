import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Loader2, RefreshCw, Clock,
  ArrowRight, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { authService } from '@/services/authService';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTDOWN TIMER — for resend cooldown
// ═══════════════════════════════════════════════════════════════════════════════

const useCountdown = (initial = 30) => {
  const [count, setCount] = useState(initial);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) return;
    if (count <= 0) { setActive(false); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, active]);

  const reset = useCallback(() => { setCount(initial); setActive(true); }, [initial]);

  return { count, active, reset };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE OTP DIGIT BOX
// ═══════════════════════════════════════════════════════════════════════════════

const DigitBox = ({ value, index, inputRef, onChange, onKeyDown, onPaste, hasError, isComplete }) => {
  const [focused, setFocused] = useState(false);
  const isFilled = value !== '';

  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-[14px] pointer-events-none"
        animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.95 }}
        transition={{ duration: 0.2 }}
        style={{
          background: hasError
            ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.06))'
            : isComplete
            ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.08))'
            : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(20,184,166,0.08))',
        }}
      />

      <motion.input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={e => onChange(index, e.target.value)}
        onKeyDown={e => onKeyDown(index, e)}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        whileFocus={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative w-12 h-14 text-center text-xl font-bold rounded-xl border-2
          outline-none transition-all duration-250 cursor-text
          ${hasError
            ? 'border-red-300 bg-red-50/30 text-red-600'
            : isComplete && isFilled
            ? 'border-emerald-400 bg-emerald-50/30 text-emerald-700'
            : focused
            ? 'border-primary-400 bg-white text-slate-900 shadow-lg shadow-primary-100/30'
            : isFilled
            ? 'border-primary-300 bg-primary-50/20 text-slate-900'
            : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
          }
        `}
      />

      {/* Filled indicator dot */}
      <AnimatePresence>
        {isFilled && !focused && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2
                        w-1.5 h-1.5 rounded-full
                        ${isComplete ? 'bg-emerald-500' : 'bg-primary-500'}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS STATE
// ═══════════════════════════════════════════════════════════════════════════════

const SuccessState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="flex flex-col items-center py-6 gap-5"
  >
    <div className="relative">
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-emerald-400"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, delay: 0.2 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500
                   shadow-lg shadow-emerald-200 flex items-center justify-center"
      >
        <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>

    <div className="text-center">
      <p className="text-base font-bold text-slate-900">Verified!</p>
      <p className="text-sm text-slate-500 mt-0.5">Redirecting to dashboard...</p>
    </div>

    <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN OTP VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const OTPVerification = ({ email, isRegistration, userName = '' }) => {
  const { login }      = useAuthStore();
  const { showToast }  = useUIStore();
  const navigate       = useNavigate();
  const inputRefs      = useRef([]);

  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [hasError, setHasError]   = useState(false);
  const shakeKey                  = useRef(0);

  const { count: cooldown, active: inCooldown, reset: resetCooldown } = useCountdown(30);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  // Auto-submit when all 6 digits filled
  const isComplete = otp.every(d => d !== '');
  useEffect(() => {
    if (isComplete && !loading && !success) {
      handleSubmitOtp();
    }
  }, [isComplete]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setHasError(false);

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit (handles rapid input)
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    }
    // Arrow key navigation
    if (e.key === 'ArrowLeft'  && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...Array(6)].map((_, i) => pasted[i] || '');
    setOtp(newOtp);
    const nextFocus = Math.min(pasted.length, 5);
    setTimeout(() => inputRefs.current[nextFocus]?.focus(), 50);
  };

  const handleSubmitOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;

    setLoading(true);
    setHasError(false);

    try {
      let response;
      if (isRegistration) {
        response = await authService.verifyRegistration({ email, otp: otpCode });
      } else {
        response = await authService.verifyLogin({ email, otp: otpCode });
      }

      login(response.user, response.token);
      setSuccess(true);
      showToast(isRegistration ? 'Account created!' : 'Welcome back!', 'success');
      setTimeout(() => navigate('/dashboard'), 1400);
    } catch (error) {
      shakeKey.current += 1;
      setHasError(true);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        setHasError(false);
        inputRefs.current[0]?.focus();
      }, 600);
      showToast(error.response?.data?.message || 'Invalid code. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSubmitOtp();
  };

  const handleResend = async () => {
    if (inCooldown) return;
    setResending(true);
    try {
      if (isRegistration) {
        await authService.requestRegistrationOTP({ email, name: userName, password: '' });
      } else {
        await authService.requestLoginOTP({ email });
      }
      showToast('New code sent to your email', 'success');
      setOtp(['', '', '', '', '', '']);
      resetCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      showToast('Failed to resend code. Try again.', 'error');
    } finally {
      setResending(false);
    }
  };

  if (success) return <SuccessState />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* OTP boxes */}
        <motion.div
          key={`otp-${shakeKey.current}`}
          animate={shakeKey.current > 0
            ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
            : { x: 0 }
          }
          transition={shakeKey.current > 0
            ? { duration: 0.45, ease: 'easeOut' }
            : {}
          }
          className="flex justify-center gap-2.5"
        >
          {otp.map((digit, i) => (
            <DigitBox
              key={i}
              index={i}
              value={digit}
              inputRef={el => (inputRefs.current[i] = el)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              hasError={hasError}
              isComplete={isComplete}
            />
          ))}
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {hasError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2 text-xs text-red-500 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Incorrect code — please try again
            </motion.div>
          ) : isComplete && loading ? (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2 text-xs text-primary-600 font-medium"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Verifying your code...
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary-300" />
              The code expires in 10 minutes
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button — shown when not auto-submitting */}
        <motion.button
          type="submit"
          disabled={loading || otp.join('').length !== 6}
          whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full h-[48px] rounded-xl font-semibold text-sm text-white
                     overflow-hidden transition-all duration-300
                     disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: loading
              ? 'linear-gradient(135deg, #94a3b8, #94a3b8)'
              : 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
            boxShadow: loading
              ? 'none'
              : '0 4px 20px rgba(99,102,241,0.25)',
          }}
        >
          {/* Shimmer */}
          {!loading && (
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)' }}
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative flex items-center justify-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </motion.span>
            ) : (
              <motion.span
                key="verify"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative flex items-center justify-center gap-2"
              >
                Verify Code
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Resend with countdown */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            {inCooldown ? (
              <motion.div
                key="countdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400"
              >
                <Clock className="w-3.5 h-3.5" />
                Resend available in{' '}
                <motion.span
                  key={cooldown}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold text-primary-500 tabular-nums"
                >
                  {cooldown}s
                </motion.span>
              </motion.div>
            ) : (
              <motion.button
                key="resend"
                type="button"
                onClick={handleResend}
                disabled={resending}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 mx-auto text-xs font-semibold
                           text-primary-600 hover:text-primary-700
                           transition-colors duration-200 disabled:opacity-60"
              >
                <motion.div
                  animate={resending ? { rotate: 360 } : { rotate: 0 }}
                  transition={resending
                    ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                    : { duration: 0.3 }
                  }
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.div>
                {resending ? 'Sending new code...' : "Didn't receive it? Resend code"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </motion.div>
  );
};

export default OTPVerification;