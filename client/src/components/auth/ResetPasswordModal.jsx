import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle,
  Loader2, X, KeyRound, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { getPasswordStrength } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// BACKDROP
// ═══════════════════════════════════════════════════════════════════════════════

const Backdrop = ({ onClick }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    onClick={onClick}
    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
  />
);

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD INPUT — floating label with show/hide toggle
// ═══════════════════════════════════════════════════════════════════════════════

const PasswordInput = ({ label, name, value, onChange, show, onToggleShow, error, disabled }) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="relative group">
        {/* Focus glow */}
        <motion.div
          className="absolute -inset-0.5 rounded-2xl pointer-events-none"
          animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.98 }}
          transition={{ duration: 0.2 }}
          style={{
            background: error
              ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(244,63,94,0.05))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,184,166,0.05))',
          }}
        />

        {/* Left icon */}
        <div className={`
          absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300
          ${focused ? 'text-primary-500 scale-110' : error ? 'text-red-400' : 'text-slate-400'}
        `}>
          <Lock className="w-[18px] h-[18px]" />
        </div>

        {/* Input */}
        <input
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={isActive ? '••••••••' : ''}
          className={`
            relative w-full pt-6 pb-3 pl-12 pr-12
            text-[14px] font-medium text-slate-800 bg-white rounded-xl border-2
            outline-none transition-all duration-300
            placeholder:text-slate-300 placeholder:text-xs
            disabled:opacity-50 disabled:cursor-not-allowed
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
          className="absolute left-12 pointer-events-none font-medium origin-left"
          animate={{
            top:   isActive ? '8px' : '50%',
            y:     isActive ? '0%' : '-50%',
            scale: isActive ? 0.75 : 1,
            color: focused ? '#6366f1' : error ? '#f87171' : '#94a3b8',
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            fontSize: '14px',
            letterSpacing: isActive ? '0.06em' : '0',
            textTransform: isActive ? 'uppercase' : 'none',
          }}
        >
          {label}
        </motion.label>

        {/* Eye toggle */}
        <motion.button
          type="button"
          onClick={onToggleShow}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                     w-7 h-7 rounded-lg flex items-center justify-center
                     text-slate-400 hover:text-slate-600 hover:bg-slate-100
                     transition-colors duration-200"
          tabIndex={-1}
        >
          <AnimatePresence mode="wait">
            {show ? (
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

        {/* Bottom accent bar */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full
                     bg-gradient-to-r from-primary-400 to-trust-500"
          animate={{ width: focused ? '50%' : '0%', x: '-50%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Field error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="flex items-center gap-1.5 text-xs text-red-500 pl-1 pt-0.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD STRENGTH METER
// ═══════════════════════════════════════════════════════════════════════════════

const StrengthMeter = ({ password }) => {
  const strength = getPasswordStrength(password);

  const colors = {
    weak:      { bar: '#ef4444', text: 'text-red-500',    label: 'Weak' },
    fair:      { bar: '#f59e0b', text: 'text-amber-500',  label: 'Fair' },
    good:      { bar: '#3b82f6', text: 'text-blue-500',   label: 'Good' },
    strong:    { bar: '#10b981', text: 'text-emerald-500', label: 'Strong' },
  };

  const cfg = colors[strength.strength] || colors.weak;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden px-1"
    >
      <div className="flex items-center gap-3 mb-1.5">
        {/* 4-segment bar */}
        <div className="flex-1 flex gap-1">
          {[25, 50, 75, 100].map(threshold => (
            <motion.div
              key={threshold}
              className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100"
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: strength.percentage >= threshold ? '100%' : '0%',
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ background: cfg.bar }}
              />
            </motion.div>
          ))}
        </div>
        <span className={`text-[11px] font-bold w-12 text-right ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-slate-400">
        Use 8+ characters with uppercase, numbers & symbols
      </p>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFYING VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const VerifyingView = () => (
  <motion.div
    key="verifying"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center py-12 gap-5"
  >
    <div className="relative">
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-purple-50
                   flex items-center justify-center ring-1 ring-primary-100"
      >
        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
      </motion.div>
      {/* Pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-primary-300"
        animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-slate-700">Verifying reset link...</p>
      <p className="text-xs text-slate-400 mt-1">This will just take a moment</p>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// INVALID TOKEN VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const InvalidView = ({ message, onClose }) => (
  <motion.div
    key="invalid"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    className="text-center py-6"
  >
    {/* Error icon with pulse */}
    <div className="relative w-20 h-20 mx-auto mb-6">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-red-300"
        animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500
                      shadow-lg shadow-red-200 flex items-center justify-center">
        <AlertCircle className="w-9 h-9 text-white" strokeWidth={2.5} />
      </div>
    </div>

    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
      Link Expired
    </h3>
    <p className="text-sm text-slate-500 mb-6 max-w-[260px] mx-auto leading-relaxed">
      {message || 'This reset link is invalid or has expired. Please request a new one.'}
    </p>

    <button
      type="button"
      onClick={onClose}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white
                 bg-gradient-to-r from-primary-500 to-trust-500
                 hover:from-primary-600 hover:to-trust-600
                 shadow-md shadow-primary-200 transition-all duration-200"
    >
      Back to Sign In
    </button>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const SuccessView = ({ onClose }) => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    className="text-center py-4"
  >
    {/* Animated checkmark */}
    <div className="relative w-20 h-20 mx-auto mb-6">
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-emerald-400"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, delay: 0.3 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="relative w-20 h-20 rounded-full
                   bg-gradient-to-br from-emerald-400 to-teal-500
                   shadow-lg shadow-emerald-200 flex items-center justify-center"
      >
        <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>

    <motion.h3
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-xl font-bold text-slate-900 tracking-tight mb-2"
    >
      Password Updated!
    </motion.h3>

    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="text-sm text-slate-500 mb-7 max-w-[260px] mx-auto leading-relaxed"
    >
      Your password has been reset successfully. Sign in with your new password.
    </motion.p>

    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      type="button"
      onClick={onClose}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full h-12 rounded-xl font-semibold text-sm text-white overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
        boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)' }}
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
      <span className="relative flex items-center justify-center gap-2">
        Sign In Now
        <ArrowRight className="w-4 h-4" />
      </span>
    </motion.button>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// RESET FORM VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const ResetFormView = ({
  userEmail, formData, showPassword, showConfirmPassword,
  onTogglePassword, onToggleConfirm, error, loading, onChange, onSubmit,
}) => {
  const passwordsMatch = formData.password && formData.confirmPassword &&
    formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword &&
    formData.password !== formData.confirmPassword;

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Icon */}
      <div className="flex justify-center mb-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-purple-50
                     flex items-center justify-center ring-1 ring-primary-100 shadow-sm"
        >
          <ShieldCheck className="w-6 h-6 text-primary-600" />
        </motion.div>
      </div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Set New Password
        </h3>
        <p className="text-sm text-slate-500 mt-1.5">
          Resetting password for{' '}
          <span className="font-semibold bg-gradient-to-r from-primary-600 to-trust-600
                           bg-clip-text text-transparent">
            {userEmail}
          </span>
        </p>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-5"
          >
            <div className="relative flex items-start gap-3 p-3.5
                            bg-gradient-to-r from-red-50 to-rose-50
                            border border-red-200 rounded-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1
                              bg-gradient-to-b from-red-400 to-rose-500 rounded-l-xl" />
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 ml-1" />
              <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* New password */}
        <PasswordInput
          label="New Password"
          name="password"
          value={formData.password}
          onChange={onChange}
          show={showPassword}
          onToggleShow={onTogglePassword}
          disabled={loading}
        />

        {/* Strength meter */}
        <AnimatePresence>
          {formData.password && <StrengthMeter password={formData.password} />}
        </AnimatePresence>

        {/* Confirm password */}
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onChange}
          show={showConfirmPassword}
          onToggleShow={onToggleConfirm}
          disabled={loading}
        />

        {/* Match indicator */}
        <AnimatePresence>
          {formData.confirmPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden px-1"
            >
              <div className={`flex items-center gap-1.5 text-xs font-medium
                ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {passwordsMatch
                    ? <CheckCircle className="w-3.5 h-3.5" />
                    : <AlertCircle className="w-3.5 h-3.5" />
                  }
                </motion.div>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || passwordsMismatch}
          whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="relative w-full h-[48px] rounded-xl font-semibold text-sm text-white
                     overflow-hidden transition-all duration-300
                     disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            background: loading
              ? 'linear-gradient(135deg, #94a3b8, #94a3b8)'
              : 'linear-gradient(135deg, #6366f1, #14b8a6)',
            boxShadow: loading
              ? 'none'
              : '0 4px 15px rgba(99,102,241,0.25)',
          }}
        >
          {/* Shimmer */}
          {!loading && (
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)' }}
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
                Resetting Password...
              </motion.span>
            ) : (
              <motion.span
                key="submit"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Reset Password
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const ResetPasswordModal = ({ isOpen, onClose, token }) => {
  const { showToast } = useUIStore();

  const [formData, setFormData]               = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirm] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [verifying, setVerifying]             = useState(true);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [tokenValid, setTokenValid]           = useState(false);
  const [userEmail, setUserEmail]             = useState('');
  const [invalidMsg, setInvalidMsg]           = useState('');

  // Verify token when modal opens
  useEffect(() => {
    if (token && isOpen) {
      setVerifying(true);
      authService.verifyResetToken(token)
        .then(res => { setTokenValid(true); setUserEmail(res.email || res.data?.email || ''); })
        .catch(err => { setInvalidMsg(err.response?.data?.message || 'Invalid or expired link'); setTokenValid(false); })
        .finally(() => setVerifying(false));
    }
  }, [token, isOpen]);

  // Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.password) { setError('Please enter a new password'); return; }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await authService.resetPassword(token, formData.password, formData.confirmPassword);
      setSuccess(true);
      showToast('Password reset successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleClose = () => {
    setFormData({ password: '', confirmPassword: '' });
    setError(''); setSuccess(false); setLoading(false);
    setVerifying(true); setTokenValid(false);
    setShowPassword(false); setShowConfirm(false);
    onClose();
  };

  // Determine which view to show
  const getView = () => {
    if (verifying)              return 'verifying';
    if (!tokenValid)            return 'invalid';
    if (success)                return 'success';
    return 'form';
  };

  const view = getView();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Backdrop onClick={handleClose} />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="relative w-full max-w-[420px] pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Card */}
              <div className="relative overflow-hidden rounded-3xl bg-white
                              border border-slate-200/60
                              shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)]">

                {/* Top gradient accent */}
                <div className="h-1 bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500" />

                {/* Close button */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl
                             flex items-center justify-center
                             text-slate-400 hover:text-slate-700 hover:bg-slate-100
                             transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="p-8">
                  <AnimatePresence mode="wait">
                    {view === 'verifying' && <VerifyingView />}
                    {view === 'invalid'   && <InvalidView  message={invalidMsg} onClose={handleClose} />}
                    {view === 'success'   && <SuccessView  onClose={handleClose} />}
                    {view === 'form'      && (
                      <ResetFormView
                        userEmail={userEmail}
                        formData={formData}
                        showPassword={showPassword}
                        showConfirmPassword={showConfirmPassword}
                        onTogglePassword={() => setShowPassword(v => !v)}
                        onToggleConfirm={() => setShowConfirm(v => !v)}
                        error={error}
                        loading={loading}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResetPasswordModal;