import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff, AlertCircle,
  ArrowRight, Loader2, X, Sparkles,
} from 'lucide-react';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { validateEmail, getPasswordStrength } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING LABEL FIELD — consistent with LoginForm
// ═══════════════════════════════════════════════════════════════════════════════

const FormField = ({
  label, name, type = 'text', placeholder,
  icon: Icon, value, onChange, error, rightSlot, delay = 0,
}) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="space-y-1.5"
    >
      <div className="relative group">
        {/* Focus glow */}
        <motion.div
          className="absolute -inset-0.5 rounded-[14px] pointer-events-none"
          animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.98 }}
          transition={{ duration: 0.25 }}
          style={{
            background: error
              ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.06))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,184,166,0.06))',
          }}
        />

        {/* Left icon */}
        <div className={`
          absolute left-3.5 top-1/2 -translate-y-1/2 z-10
          transition-all duration-300
          ${focused ? 'text-primary-500 scale-110' : error ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-500'}
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
          autoComplete={name === 'password' ? 'new-password' : name}
          className={`
            relative w-full pt-6 pb-2.5 pl-11 ${rightSlot ? 'pr-12' : 'pr-4'}
            text-[14px] font-medium text-slate-800 bg-white rounded-xl border-2
            outline-none transition-all duration-300
            placeholder:text-slate-300 placeholder:text-xs placeholder:font-normal
            ${error
              ? 'border-red-300 focus:border-red-400 bg-red-50/20'
              : focused
              ? 'border-primary-400 shadow-lg shadow-primary-100/30'
              : 'border-slate-200 hover:border-slate-300'
            }
          `}
        />

        {/* Floating label */}
        <motion.label
          htmlFor={name}
          className="absolute left-11 pointer-events-none font-medium origin-left"
          animate={{
            top:   isActive ? '8px' : '50%',
            y:     isActive ? '0%' : '-50%',
            scale: isActive ? 0.75 : 1,
            color: focused ? '#6366f1' : error ? '#f87171' : '#94a3b8',
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            fontSize: '14px',
            letterSpacing: isActive ? '0.07em' : '0',
            textTransform: isActive ? 'uppercase' : 'none',
          }}
        >
          {label}
        </motion.label>

        {/* Right slot */}
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
            {rightSlot}
          </div>
        )}

        {/* Bottom accent bar */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full
                     bg-gradient-to-r from-primary-400 to-trust-500"
          animate={{ width: focused ? '55%' : '0%', x: '-50%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Field error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
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
// PASSWORD STRENGTH METER — 4-segment with animated fill
// ═══════════════════════════════════════════════════════════════════════════════

const StrengthMeter = ({ password }) => {
  const strength = getPasswordStrength(password);
  const cfg = {
    weak:   { bar: '#ef4444', text: 'text-red-500',    bg: 'bg-red-50',    label: 'Weak' },
    fair:   { bar: '#f59e0b', text: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Fair' },
    good:   { bar: '#3b82f6', text: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Good' },
    strong: { bar: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Strong' },
  }[strength.strength] || { bar: '#ef4444', text: 'text-red-500', bg: 'bg-red-50', label: 'Weak' };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden px-0.5"
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        {/* 4 segments */}
        <div className="flex-1 flex gap-1">
          {[25, 50, 75, 100].map(threshold => (
            <div key={threshold} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: strength.percentage >= threshold ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ background: cfg.bar }}
              />
            </div>
          ))}
        </div>
        <span className={`text-[11px] font-bold min-w-[38px] text-right ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Use 8+ characters with uppercase, numbers & symbols
      </p>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER ERROR BANNER — accent bar style
// ═══════════════════════════════════════════════════════════════════════════════

const ErrorBanner = ({ message, onDismiss }) => {
  const isEmailExists = message?.toLowerCase().includes('exist') ||
                        message?.toLowerCase().includes('already');

  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-rose-50 to-red-50" />
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1
                      bg-gradient-to-b from-red-400 via-rose-500 to-red-400" />
      {/* Auto-dismiss progress */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-red-200"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 8, ease: 'linear' }}
      />

      <div className="relative flex items-start gap-3 p-4">
        <div className="ml-1 w-8 h-8 rounded-lg bg-red-100 flex items-center
                        justify-center flex-shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-sm font-bold text-red-800">Registration Failed</p>
          <p className="text-xs text-red-600/90 mt-0.5 leading-relaxed">{message}</p>
          {isEmailExists && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[11px] text-red-500/70 mt-1"
            >
              → Try signing in instead using the toggle above.
            </motion.p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center
                     text-red-400 hover:text-red-600 hover:bg-red-100 transition-all duration-150"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT BUTTON — gradient with shimmer
// ═══════════════════════════════════════════════════════════════════════════════

const SubmitButton = ({ loading, hasError, delay = 0 }) => (
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
                 overflow-hidden transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-75"
      style={{
        background: loading
          ? 'linear-gradient(135deg, #94a3b8, #94a3b8)'
          : 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
        boxShadow: loading
          ? 'none'
          : '0 4px 20px rgba(99,102,241,0.3), 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Shimmer sweep */}
      {!loading && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)',
          }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.65 }}
        />
      )}

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
            Creating Account...
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
            <Sparkles className="w-4 h-4" />
            Create Account
            <ArrowRight className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER FORM
// ═══════════════════════════════════════════════════════════════════════════════

const RegisterForm = ({ onSuccess }) => {
  const { showToast } = useUIStore();

  const [formData, setFormData]           = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [errors, setErrors]               = useState({});
  const [serverError, setServerError]     = useState('');
  const [attemptCount, setAttemptCount]   = useState(0);
  const shakeKey = useRef(0);

  const validate = () => {
    const e = {};
    if (!formData.name.trim())
      e.name = 'Full name is required';
    else if (formData.name.trim().length < 2)
      e.name = 'Name must be at least 2 characters';

    if (!formData.email)
      e.email = 'Email is required';
    else if (!validateEmail(formData.email))
      e.email = 'Enter a valid email address';

    if (!formData.password)
      e.password = 'Password is required';
    else if (formData.password.length < 8)
      e.password = 'Minimum 8 characters required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      shakeKey.current += 1;
      return;
    }

    setLoading(true);
    try {
      await authService.requestRegistrationOTP(formData);
      showToast('OTP sent to your email', 'success');
      onSuccess(formData.email, formData.name);
    } catch (error) {
      shakeKey.current += 1;
      setAttemptCount(prev => prev + 1);
      const msg = error.response?.data?.message || 'Registration failed. Please try again.';
      setServerError(msg);
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

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
      // Shake on failed attempt
      key={`register-${shakeKey.current}`}
      initial={shakeKey.current > 0 ? { x: 0 } : { opacity: 0 }}
      animate={shakeKey.current > 0
        ? { x: [0, -10, 10, -8, 8, -5, 5, 0] }
        : { opacity: 1 }
      }
      transition={shakeKey.current > 0
        ? { duration: 0.5, ease: 'easeOut' }
        : { duration: 0.3 }
      }
    >
      {/* Server error banner */}
      <AnimatePresence mode="wait">
        {serverError && (
          <ErrorBanner
            message={serverError}
            onDismiss={() => setServerError('')}
          />
        )}
      </AnimatePresence>

      {/* Name */}
      <FormField
        label="Full Name"
        name="name"
        type="text"
        placeholder="John Doe"
        icon={User}
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        delay={0.05}
      />

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
        delay={0.1}
      />

      {/* Password */}
      <FormField
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Min. 8 characters"
        icon={Lock}
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        delay={0.15}
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

      {/* Strength meter */}
      <AnimatePresence>
        {formData.password && <StrengthMeter password={formData.password} />}
      </AnimatePresence>

      {/* Terms note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-[11px] text-slate-400 text-center leading-relaxed"
      >
        By creating an account, you agree to our{' '}
        <button type="button" className="text-primary-500 hover:text-primary-600 font-medium transition-colors">
          Terms
        </button>
        {' '}and{' '}
        <button type="button" className="text-primary-500 hover:text-primary-600 font-medium transition-colors">
          Privacy Policy
        </button>
      </motion.p>

      {/* Submit */}
      <SubmitButton
        loading={loading}
        hasError={!!serverError}
        delay={0.2}
      />
    </motion.form>
  );
};

export default RegisterForm;