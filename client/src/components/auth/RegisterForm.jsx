import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authService } from '@/services/authService';
import useUIStore from '@/store/uiStore';
import { validateEmail, getPasswordStrength } from '@/utils/helpers';

const RegisterForm = ({ onSuccess }) => {
  const { showToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const passwordStrength = getPasswordStrength(formData.password);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await authService.requestRegistrationOTP(formData);
      showToast('OTP sent to your email', 'success');
      onSuccess(formData.email, formData.name);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      
      setServerError(errorMessage);
      showToast(errorMessage, 'error');
      
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      {/* Server Error Alert */}
      {serverError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{serverError}</p>
            {serverError.includes('exists') && (
              <p className="text-xs text-red-600 mt-1">
                Already have an account? Click "Sign In" below.
              </p>
            )}
          </div>
        </motion.div>
      )}

      <Input
        label="Full Name"
        name="name"
        type="text"
        placeholder="John Doe"
        icon={User}
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
      />

      <Input
        label="Email Address"
        name="email"
        type="email"
        placeholder="john@example.com"
        icon={Mail}
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
      />

      <div className="relative">
        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-[42px] text-slate-400 hover:text-slate-600 z-10"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {/* Password Strength Indicator */}
        {formData.password && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2"
          >
            <div className="flex items-center gap-2 mb-1">
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
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Create Account
      </Button>
    </motion.form>
  );
};

export default RegisterForm;