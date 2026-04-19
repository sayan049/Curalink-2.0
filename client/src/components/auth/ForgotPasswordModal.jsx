import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, CheckCircle, AlertCircle, ArrowLeft,
  Loader2, X, KeyRound, Send, Clock, Inbox,
} from 'lucide-react';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { validateEmail } from '@/utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// BACKDROP — click-to-close overlay
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
// ANIMATED INPUT
// ═══════════════════════════════════════════════════════════════════════════════

const EmailInput = ({ value, onChange, error, disabled }) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="relative group">
        {/* Focus glow */}
        <motion.div
          className="absolute -inset-0.5 rounded-2xl pointer-events-none"
          animate={{
            opacity: focused ? 1 : 0,
            scale: focused ? 1 : 0.98,
          }}
          transition={{ duration: 0.2 }}
          style={{
            background: error
              ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(244,63,94,0.05))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,184,166,0.05))',
          }}
        />

        {/* Icon */}
        <div className={`
          absolute left-4 top-1/2 -translate-y-1/2 z-10
          transition-all duration-300
          ${focused
            ? 'text-primary-500 scale-110'
            : error
            ? 'text-red-400'
            : 'text-slate-400 group-hover:text-slate-500'
          }
        `}>
          <Mail className="w-[18px] h-[18px]" />
        </div>

        {/* Input */}
        <input
          type="email"
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={isActive ? 'your-email@example.com' : ''}
          autoFocus
          className={`
            relative w-full pt-6 pb-3 pl-12 pr-4
            text-[14px] font-medium text-slate-800 bg-white rounded-xl border-2
            outline-none transition-all duration-300
            placeholder:text-slate-300 placeholder:text-xs placeholder:font-normal
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
            top: isActive ? '8px' : '50%',
            y: isActive ? '0%' : '-50%',
            scale: isActive ? 0.75 : 1,
            color: focused
              ? '#6366f1'
              : error
              ? '#f87171'
              : '#94a3b8',
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            fontSize: '14px',
            letterSpacing: isActive ? '0.06em' : '0',
            textTransform: isActive ? 'uppercase' : 'none',
          }}
        >
          Email Address
        </motion.label>

        {/* Bottom accent */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full
                     bg-gradient-to-r from-primary-400 to-trust-500"
          animate={{ width: focused ? '50%' : '0%', x: '-50%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Error */}
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
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS VIEW — animated checkmark + instructions
// ═══════════════════════════════════════════════════════════════════════════════

const SuccessView = ({ email, onClose }) => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    className="text-center py-4"
  >
    {/* Animated checkmark with rings */}
    <div className="relative w-20 h-20 mx-auto mb-6">
      {/* Expanding rings */}
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-emerald-400"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.5, 0] }}
          transition={{
            duration: 1.2,
            delay: 0.3 + i * 0.15,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="relative w-20 h-20 rounded-full
                   bg-gradient-to-br from-emerald-400 to-teal-500
                   shadow-lg shadow-emerald-200
                   flex items-center justify-center"
      >
        <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>

    {/* Text */}
    <motion.h3
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-xl font-bold text-slate-900 mb-2"
    >
      Check Your Inbox!
    </motion.h3>

    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="text-sm text-slate-500 mb-1"
    >
      We sent a reset link to
    </motion.p>

    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="font-semibold bg-gradient-to-r from-primary-600 to-trust-600
                 bg-clip-text text-transparent mb-6 text-sm"
    >
      {email}
    </motion.p>

    {/* Instructions card */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-gradient-to-br from-blue-50 to-primary-50 rounded-2xl p-5 text-left mb-6
                 border border-blue-100"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Inbox className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Check your inbox</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Also check spam/junk folder</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <KeyRound className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Click the reset link</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Set your new password</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Link expires in 30 minutes</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Request a new one if it expires</p>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Close button */}
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
      onClick={onClose}
      className="w-full py-3 rounded-xl text-sm font-semibold text-slate-600
                 bg-slate-100 hover:bg-slate-200
                 transition-colors duration-200"
    >
      Back to Sign In
    </motion.button>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FORM VIEW — email input + submit
// ═══════════════════════════════════════════════════════════════════════════════

const FormView = ({ email, setEmail, error, setError, loading, onSubmit, onClose }) => (
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
        <KeyRound className="w-6 h-6 text-primary-600" />
      </motion.div>
    </div>

    {/* Title */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="text-center mb-6"
    >
      <h3 className="text-xl font-bold text-slate-900 tracking-tight">
        Forgot your password?
      </h3>
      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
        No worries — enter your email and we'll send you a reset link.
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
          className="overflow-hidden mb-4"
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

    {/* Form */}
    <form onSubmit={onSubmit} className="space-y-5">
      <EmailInput
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        error={null}
        disabled={loading}
      />

      {/* Submit button */}
      <motion.button
        type="submit"
        disabled={loading}
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
            : '0 4px 15px rgba(99,102,241,0.25), 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Shimmer */}
        {!loading && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
            }}
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
              Sending Link...
            </motion.span>
          ) : (
            <motion.span
              key="submit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Reset Link
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Back link */}
      <motion.button
        type="button"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full flex items-center justify-center gap-1.5
                   text-sm text-slate-400 hover:text-slate-700
                   transition-colors duration-200 py-1 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to sign in
      </motion.button>
    </form>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { showToast } = useUIStore();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
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
      const msg = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(msg);
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

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Backdrop onClick={handleClose} />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="relative w-full max-w-[420px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
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
                    {success ? (
                      <SuccessView email={email} onClose={handleClose} />
                    ) : (
                      <FormView
                        email={email}
                        setEmail={setEmail}
                        error={error}
                        setError={setError}
                        loading={loading}
                        onSubmit={handleSubmit}
                        onClose={handleClose}
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

export default ForgotPasswordModal;