import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle,
  ArrowRight, CheckCircle2, Loader2, X,
  ShieldCheck, Zap, Fingerprint,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';
import { authService } from '@/services/authService';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import { validateEmail } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED INPUT FIELD — with magnetic label + glow border
// ═══════════════════════════════════════════════════════════════════════════════

const FormField = ({
  label, name, type = 'text', placeholder,
  icon: Icon, value, onChange, error, rightSlot, delay = 0,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value?.length > 0;
  const isActive = focused || hasValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-1.5"
    >
      <div className="relative group">
        {/* Glow effect on focus */}
        <motion.div
          className="absolute -inset-0.5 rounded-[14px] opacity-0 pointer-events-none"
          animate={{
            opacity: focused ? 1 : 0,
            scale: focused ? 1 : 0.98,
          }}
          transition={{ duration: 0.25 }}
          style={{
            background: error
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(244,63,94,0.1))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.08))',
          }}
        />

        {/* Icon */}
        <div className={`
          absolute left-3.5 top-1/2 -translate-y-1/2 z-10
          transition-all duration-300
          ${focused
            ? 'text-primary-500 scale-110'
            : error
            ? 'text-red-400'
            : 'text-slate-400 group-hover:text-slate-500'
          }
        `}>
          <Icon className="w-[18px] h-[18px]" />
        </div>

        {/* Input */}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isActive ? placeholder : ''}
          autoComplete={name === 'password' ? 'current-password' : name}
          className={`
            relative w-full pt-6 pb-2.5 pl-11 ${rightSlot ? 'pr-12' : 'pr-4'}
            text-[14px] font-medium text-slate-800 bg-white rounded-xl border-2
            outline-none transition-all duration-300
            placeholder:text-slate-300 placeholder:text-xs placeholder:font-normal
            ${error
              ? 'border-red-300 focus:border-red-400 bg-red-50/30'
              : focused
              ? 'border-primary-400 shadow-lg shadow-primary-100/30 bg-white'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }
          `}
        />

        {/* Floating Label */}
        <motion.label
          htmlFor={name}
          className="absolute left-11 pointer-events-none font-medium origin-left"
          animate={{
            top: isActive ? '8px' : '50%',
            y: isActive ? '0%' : '-50%',
            scale: isActive ? 0.75 : 1,
            color: focused
              ? '#6366f1'
              : error
              ? '#f87171'
              : isActive
              ? '#94a3b8'
              : '#94a3b8',
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            fontSize: '14px',
            letterSpacing: isActive ? '0.08em' : '0',
            textTransform: isActive ? 'uppercase' : 'none',
          }}
        >
          {label}
        </motion.label>

        {/* Right Slot */}
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
            {rightSlot}
          </div>
        )}

        {/* Bottom active indicator bar */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full bg-gradient-to-r from-primary-400 to-violet-500"
          animate={{
            width: focused ? '60%' : '0%',
            x: '-50%',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="flex items-center gap-1.5 text-xs text-red-500 pl-1 pt-0.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BANNER — with accent bar + auto-dismiss
// ═══════════════════════════════════════════════════════════════════════════════

const ErrorBanner = ({ message, onDismiss, attemptCount }) => {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(4px)' }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-rose-50 to-red-50" />

      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 via-rose-500 to-red-400" />

      {/* Auto-dismiss progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-red-300/60"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 8, ease: 'linear' }}
      />

      <div className="relative flex items-start gap-3 p-4">
        {/* Icon with pulse */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5 text-red-600" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-lg border border-red-300"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-bold text-red-800">
            Sign In Failed
          </p>
          <p className="text-xs text-red-600/90 mt-0.5 leading-relaxed">
            {message}
          </p>
          {attemptCount >= 2 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[11px] text-red-500/70 mt-1.5 flex items-center gap-1"
            >
              <Fingerprint className="w-3 h-3" />
              Try resetting your password if you forgot it.
            </motion.p>
          )}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-full
                     flex items-center justify-center
                     text-red-400 hover:text-red-600 hover:bg-red-100
                     transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT BUTTON — with gradient shift + loading state
// ═══════════════════════════════════════════════════════════════════════════════

const SubmitButton = ({ loading, hasError, delay = 0 }) => {
  const bgGradient = loading
    ? 'linear-gradient(135deg, #94a3b8, #94a3b8)'
    : hasError
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)';

  const shadow = loading
    ? 'none'
    : hasError
    ? '0 4px 20px rgba(239,68,68,0.3)'
    : '0 4px 20px rgba(99,102,241,0.35), 0 1px 3px rgba(0,0,0,0.1)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="relative w-full h-[50px] rounded-xl font-semibold text-sm text-white
                   overflow-hidden transition-all duration-300
                   disabled:cursor-not-allowed disabled:opacity-80"
        style={{ background: bgGradient, boxShadow: shadow }}
      >
        {/* Shimmer sweep */}
        {!loading && !hasError && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
            }}
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center gap-2.5"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing In...
            </motion.span>
          ) : hasError ? (
            <motion.span
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Try Again
            </motion.span>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center gap-2"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS STATE — with confetti-style rings + progress
// ═══════════════════════════════════════════════════════════════════════════════

const SuccessState = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center py-12 gap-6"
  >
    {/* Checkmark with rings */}
    <div className="relative">
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-6 rounded-full bg-emerald-400/10"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1.2] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Rings */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ border: `1.5px solid rgba(52,211,153,${0.4 - i * 0.12})` }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 2 + i * 0.5], opacity: [0.6, 0] }}
          transition={{
            duration: 1.2,
            delay: 0.3 + i * 0.15,
            repeat: Infinity,
            repeatDelay: 0.8,
          }}
        />
      ))}

      {/* Icon circle */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
        className="relative w-20 h-20 rounded-full
                   bg-gradient-to-br from-emerald-400 to-teal-500
                   shadow-lg shadow-emerald-200
                   flex items-center justify-center"
      >
        <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>

    {/* Text */}
    <div className="text-center space-y-1.5">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold text-slate-900"
      >
        Welcome back! 🎉
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-slate-500"
      >
        Preparing your research dashboard...
      </motion.p>
    </div>

    {/* Progress bar */}
    <motion.div
      initial={{ opacity: 0, scaleX: 0.8 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.5 }}
      className="w-56 h-2 bg-slate-100 rounded-full overflow-hidden"
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"
        style={{ backgroundSize: '200% 100%' }}
        initial={{ width: '0%' }}
        animate={{
          width: '100%',
          backgroundPosition: ['0% 50%', '100% 50%'],
        }}
        transition={{
          width: { duration: 1, ease: 'easeOut', delay: 0.5 },
          backgroundPosition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
        }}
      />
    </motion.div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST BADGES — animated on mount
// ═══════════════════════════════════════════════════════════════════════════════

const TrustBadges = () => {
  const badges = [
    { icon: ShieldCheck, label: '256-bit SSL', color: 'text-emerald-500' },
    { icon: Lock,        label: 'HIPAA Safe',  color: 'text-primary-500' },
    { icon: Zap,         label: 'Instant Auth', color: 'text-amber-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-center justify-center gap-6 pt-2"
    >
      {badges.map(({ icon: BadgeIcon, label, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.08 }}
          className="flex items-center gap-1.5 group cursor-default"
        >
          <BadgeIcon className={`w-3.5 h-3.5 ${color} opacity-60 
                                 group-hover:opacity-100 transition-opacity duration-300`} />
          <span className="text-[10px] text-slate-400 font-medium 
                           group-hover:text-slate-600 transition-colors duration-300">
            {label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN FORM — main component
// ═══════════════════════════════════════════════════════════════════════════════

const LoginForm = () => {
  const navigate  = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const [formData, setFormData]         = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState({});
  const [serverError, setServerError]   = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const formRef    = useRef(null);
  const shakeKey   = useRef(0);

  const validate = useCallback(() => {
    const e = {};
    if (!formData.email)
      e.email = 'Email is required';
    else if (!validateEmail(formData.email))
      e.email = 'Enter a valid email address';
    if (!formData.password)
      e.password = 'Password is required';
    else if (formData.password.length < 6)
      e.password = 'Minimum 6 characters required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      shakeKey.current += 1;
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(formData);
      login(response.user, response.token);
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      shakeKey.current += 1;
      setAttemptCount(prev => prev + 1);
      setServerError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError)  setServerError('');
  };

  // ── Success view ──
  if (loginSuccess) return <SuccessState />;

  return (
    <>
      <motion.form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
        // Re-trigger shake on each failed attempt
        key={`form-${shakeKey.current}`}
        initial={shakeKey.current > 0
          ? { x: 0 }
          : { opacity: 0 }
        }
        animate={shakeKey.current > 0
          ? { x: [0, -10, 10, -8, 8, -5, 5, 0] }
          : { opacity: 1 }
        }
        transition={shakeKey.current > 0
          ? { duration: 0.5, ease: 'easeOut' }
          : { duration: 0.3 }
        }
      >
        {/* Server Error Banner */}
        <AnimatePresence mode="wait">
          {serverError && (
            <ErrorBanner
              message={serverError}
              onDismiss={() => setServerError('')}
              attemptCount={attemptCount}
            />
          )}
        </AnimatePresence>

        {/* Email */}
        <FormField
          label="Email Address"
          name="email"
          type="email"
          placeholder="john@example.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          delay={0.05}
        />

        {/* Password */}
        <FormField
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          delay={0.1}
          rightSlot={
            <motion.button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-slate-600 hover:bg-slate-100
                         transition-colors duration-200"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <AnimatePresence mode="wait">
                {showPassword ? (
                  <motion.div key="hide" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <EyeOff className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div key="show" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Eye className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          }
        />

        {/* Forgot password row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex justify-between items-center"
        >
          <AnimatePresence>
            {attemptCount >= 2 && (
              <motion.p
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="text-xs text-amber-600 font-medium flex items-center gap-1"
              >
                <Fingerprint className="w-3 h-3" />
                Reset your password?
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setShowForgotPw(true)}
            className="ml-auto text-xs font-semibold text-primary-600
                       hover:text-primary-700 transition-colors
                       underline-offset-2 hover:underline"
          >
            Forgot password?
          </button>
        </motion.div>

        {/* Submit */}
        <SubmitButton
          loading={loading}
          hasError={!!serverError}
          delay={0.2}
        />

        {/* Trust badges */}
        <TrustBadges />
      </motion.form>

      <ForgotPasswordModal
        isOpen={showForgotPw}
        onClose={() => setShowForgotPw(false)}
      />
    </>
  );
};

export default LoginForm;