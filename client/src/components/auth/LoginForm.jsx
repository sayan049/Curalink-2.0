import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle,
  ArrowRight, CheckCircle2, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';
import { authService } from '@/services/authService';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import { validateEmail } from '@/utils/helpers';

// ─── Floating Label Input ────────────────────────────────────────────────────
const FormField = ({
  label, name, type = 'text', placeholder,
  icon: Icon, value, onChange, error, rightSlot,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value?.length > 0;
  const isActive = focused || hasValue;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {/* Icon */}
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            focused
              ? 'text-primary-500'
              : error
              ? 'text-red-400'
              : 'text-slate-400'
          }`}
        >
          <Icon className="w-4 h-4" />
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
          placeholder={focused ? placeholder : ''}
          className={`
            w-full pt-5 pb-2 pl-10 pr-${rightSlot ? '11' : '4'}
            text-sm text-slate-800 bg-white rounded-xl border-2
            outline-none transition-all duration-200 peer
            placeholder:text-slate-300
            ${error
              ? 'border-red-300 focus:border-red-400 bg-red-50/30'
              : focused
              ? 'border-primary-400 shadow-sm shadow-primary-100'
              : 'border-slate-200 hover:border-slate-300'
            }
          `}
        />

        {/* Floating Label */}
        <label
          htmlFor={name}
          className={`
            absolute left-10 transition-all duration-200 pointer-events-none font-medium
            ${isActive
              ? 'top-2 text-[10px] tracking-wide uppercase'
              : 'top-1/2 -translate-y-1/2 text-sm'
            }
            ${focused
              ? 'text-primary-500'
              : error
              ? 'text-red-400'
              : isActive
              ? 'text-slate-400'
              : 'text-slate-400'
            }
          `}
        >
          {label}
        </label>

        {/* Right Slot (eye toggle etc.) */}
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-xs text-red-500 pl-1"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Server Error Banner ─────────────────────────────────────────────────────
const ErrorBanner = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -8, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.98 }}
    transition={{ duration: 0.25 }}
    className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 
               rounded-xl"
  >
    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center 
                    flex-shrink-0">
      <AlertCircle className="w-4 h-4 text-red-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-red-800">Authentication Failed</p>
      <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{message}</p>
    </div>
  </motion.div>
);

// ─── Submit Button ───────────────────────────────────────────────────────────
const SubmitButton = ({ loading }) => (
  <motion.button
    type="submit"
    disabled={loading}
    whileTap={{ scale: loading ? 1 : 0.98 }}
    className="relative w-full h-12 rounded-xl font-semibold text-sm text-white
               overflow-hidden transition-all duration-200 disabled:cursor-not-allowed"
    style={{
      background: loading
        ? 'linear-gradient(135deg, #94a3b8, #94a3b8)'
        : 'linear-gradient(135deg, #6366f1, #4f46e5)',
      boxShadow: loading ? 'none' : '0 4px 15px rgba(99,102,241,0.35)',
    }}
  >
    {/* Shimmer on hover */}
    {!loading && (
      <motion.div
        className="absolute inset-0 bg-white/10"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.5 }}
      />
    )}

    <span className="relative flex items-center justify-center gap-2">
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Signing In...
        </>
      ) : (
        <>
          Sign In
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </span>
  </motion.button>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = ({ label }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-slate-100" />
    <span className="text-xs text-slate-400 font-medium">{label}</span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

// ─── Login Form ──────────────────────────────────────────────────────────────
const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.login(formData);
      login(response.user, response.token);
      setLoginSuccess(true);
      showToast('Login successful! Welcome back!', 'success');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setServerError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  // ── Success State ──
  if (loginSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8 gap-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </motion.div>
        <div className="text-center">
          <p className="font-bold text-slate-900">Login Successful!</p>
          <p className="text-sm text-slate-500 mt-1">Redirecting to dashboard...</p>
        </div>
        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {/* Server Error */}
        <AnimatePresence>
          {serverError && <ErrorBanner message={serverError} />}
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
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          }
        />

        {/* Forgot Password */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 
                       transition-colors hover:underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <SubmitButton loading={loading} />

        {/* Divider */}
        <Divider label="Secure Login" />

        {/* Security Note */}
        <div className="flex items-center justify-center gap-4">
          {['🔒 256-bit SSL', '🛡️ HIPAA Safe', '⚡ Instant Access'].map((item) => (
            <span key={item} className="text-[10px] text-slate-400 font-medium">
              {item}
            </span>
          ))}
        </div>
      </motion.form>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
};

export default LoginForm;