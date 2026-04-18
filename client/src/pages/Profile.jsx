import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  User, Mail, MapPin, Heart, Save,
  MessageSquare, BookOpen, FlaskConical, Activity,
  Calendar, Sparkles, Brain, Shield, Edit3,
  CheckCircle, Camera, Zap, TrendingUp, Clock
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip
} from 'recharts';
import PageTransition from '@/components/animations/PageTransition';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import { authService } from '@/services/authService';
import api from '@/services/api';
import { formatDate, formatNumber } from '@/utils/helpers';

// ── Animated counter ──────────────────────────────────────
const Counter = ({ value, isNumber = true }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !isNumber) return;
    const end = parseInt(value) || 0;
    if (!end) return;
    let c = 0;
    const s = Math.max(1, Math.ceil(end / 25));
    const t = setInterval(() => { c += s; if (c >= end) { setN(end); clearInterval(t); } else setN(c); }, 20);
    return () => clearInterval(t);
  }, [inView, value, isNumber]);
  return <span ref={ref}>{isNumber ? formatNumber(n) : value}</span>;
};

// ── Avatar with initials ──────────────────────────────────
const ProfileAvatar = ({ name, size = 'xl' }) => {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) : 'U';
  const sizeMap = { xl: 'w-24 h-24 text-3xl', '2xl': 'w-28 h-28 text-4xl' };
  return (
    <div className="relative group">
      <div className={`${sizeMap[size]} rounded-3xl bg-gradient-to-br from-primary-500 via-trust-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-2xl shadow-primary-500/30`}>
        {initials}
      </div>
      <div className="absolute inset-0 rounded-3xl ring-4 ring-white/50 ring-offset-2" />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-400 to-purple-500 blur-md -z-10"
      />
    </div>
  );
};

// ── Chart tooltip ─────────────────────────────────────────
const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-xl text-xs">
      <p className="font-bold text-slate-700">{payload[0]?.payload?.name}</p>
      <p className="font-semibold text-primary-600">{formatNumber(payload[0]?.value)}</p>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, gradient, shadow, delay }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay, type: 'spring', damping: 15 }}
      whileHover={{ y: -4, scale: 1.03 }}
      className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-xl ${shadow} cursor-default`}
    >
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full" />
      <div className="absolute -right-1 -bottom-5 w-12 h-12 bg-white/10 rounded-full" />
      <Icon className="w-5 h-5 mb-3 opacity-80" />
      <p className="text-2xl font-bold leading-none">
        <Counter value={parseInt(value) || 0} />
      </p>
      <p className="text-xs opacity-75 mt-1 font-medium">{label}</p>
    </motion.div>
  );
};

// ── Profile Field ─────────────────────────────────────────
const ProfileField = ({ label, name, value, onChange, icon: Icon, placeholder, helperText, disabled, type = 'text' }) => (
  <div className="group">
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary-500">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 rounded-xl border-2 transition-all outline-none
          ${disabled
            ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
            : 'bg-white border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 hover:border-slate-300'
          }`}
      />
    </div>
    {helperText && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
  </div>
);

// ── MAIN PROFILE PAGE ─────────────────────────────────────
const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    diseaseOfInterest: user?.diseaseOfInterest || '',
    location: user?.location || '',
  });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/user/stats');
      setStats(res.data.data);
    } catch { /* non-fatal */ }
    finally { setStatsLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.updateProfile(formData);
      updateUser(res.data);
      setSaved(true);
      showToast('Profile updated!', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch { showToast('Failed to update', 'error'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const radialData = stats ? [
    { name: 'Papers', value: stats.totalPublications || 0, fill: '#0ea5e9' },
    { name: 'Trials', value: stats.totalTrials || 0, fill: '#8b5cf6' },
    { name: 'Chats', value: stats.conversationCount || 0, fill: '#14b8a6' },
  ] : [];

  return (
    <PageTransition>
      <div className="relative min-h-screen">

        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-100/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-purple-100/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }} className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-r from-primary-500 to-trust-500 rounded-2xl shadow-lg shadow-primary-500/20">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-trust-600 bg-clip-text text-transparent">
                  Profile
                </h1>
                <p className="text-sm text-slate-500">Manage your account & preferences</p>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT COLUMN ─────────────────────────────── */}
            <div className="lg:col-span-1 space-y-6">

              {/* Profile Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-primary-500 via-trust-500 to-purple-600 p-8 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="relative flex flex-col items-center text-center">
                    <ProfileAvatar name={user?.name} />
                    <h2 className="text-xl font-bold text-white mt-4">{user?.name}</h2>
                    <p className="text-sm text-white/70 mt-0.5">{user?.email}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 space-y-3">
                  {user?.diseaseOfInterest && (
                    <div className="flex items-center gap-2.5 p-3 bg-primary-50 rounded-xl border border-primary-100">
                      <Brain className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Research Focus</p>
                        <p className="text-sm font-bold text-slate-800">{user.diseaseOfInterest}</p>
                      </div>
                    </div>
                  )}
                  {user?.location && (
                    <div className="flex items-center gap-2.5 p-3 bg-teal-50 rounded-xl border border-teal-100">
                      <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Location</p>
                        <p className="text-sm font-bold text-slate-800">{user.location}</p>
                      </div>
                    </div>
                  )}
                  {user?.createdAt && (
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Member Since</p>
                        <p className="text-sm font-bold text-slate-800">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {stats?.lastActive && (
                    <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-xl border border-green-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Last Active</p>
                        <p className="text-sm font-bold text-slate-800">{formatDate(stats.lastActive)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Radial chart */}
              {!statsLoading && stats && radialData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-primary-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Research Overview</h3>
                  </div>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="85%"
                        data={radialData} startAngle={90} endAngle={-270}
                      >
                        <RadialBar background dataKey="value" cornerRadius={6}
                          animationDuration={2000} animationBegin={400}
                        />
                        <Tooltip content={<ChartTip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-1">
                    {radialData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── RIGHT COLUMN ────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Stats Grid */}
              {statsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" text="Loading stats..." />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: MessageSquare, label: 'Conversations', value: stats?.conversationCount ?? 0, gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20', delay: 0 },
                    { icon: BookOpen, label: 'Publications', value: stats?.totalPublications ?? 0, gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/20', delay: 0.07 },
                    { icon: FlaskConical, label: 'Trials', value: stats?.totalTrials ?? 0, gradient: 'from-teal-500 to-green-500', shadow: 'shadow-teal-500/20', delay: 0.14 },
                    { icon: Zap, label: 'Messages', value: stats?.messageCount ?? 0, gradient: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/20', delay: 0.21 },
                  ].map(s => (
                    <StatCard key={s.label} {...s} />
                  ))}
                </div>
              )}

              {/* Edit Profile Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 20 }}
                className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                {/* Form header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-100 rounded-xl">
                      <Edit3 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Edit Profile</h3>
                      <p className="text-xs text-slate-500">Update your personal information</p>
                    </div>
                  </div>
                  {saved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-semibold"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Saved!
                    </motion.div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Name + Email row */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <ProfileField
                      label="Full Name"
                      name="name"
                      icon={User}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                    />
                    <ProfileField
                      label="Email Address"
                      name="email"
                      type="email"
                      icon={Mail}
                      value={user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                    />
                  </div>

                  {/* Disease + Location row */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <ProfileField
                      label="Disease of Interest"
                      name="diseaseOfInterest"
                      icon={Heart}
                      value={formData.diseaseOfInterest}
                      onChange={handleChange}
                      placeholder="e.g., Diabetes, Cancer"
                      helperText="Personalizes your research experience"
                    />
                    <ProfileField
                      label="Location"
                      name="location"
                      icon={MapPin}
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Kolkata, India"
                      helperText="Finds nearby clinical trials"
                    />
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Your data is encrypted and secure
                    </p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" loading={loading}
                        icon={saved ? CheckCircle : Save}
                        className={saved ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {saved ? 'Saved!' : 'Save Changes'}
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </motion.div>

              {/* Research Preferences */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Research Preferences</h3>
                    <p className="text-xs text-slate-500">How Curalink personalizes your experience</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: Brain, label: 'Disease Focus', value: user?.diseaseOfInterest || 'Not set', color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
                    { icon: MapPin, label: 'Location', value: user?.location || 'Not set', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                    { icon: TrendingUp, label: 'Research Mode', value: 'Hybrid Search', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                    { icon: Zap, label: 'AI Model', value: 'LLaMA 3.1', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                  ].map((pref, idx) => (
                    <motion.div
                      key={pref.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.06 }}
                      className={`flex items-center gap-3 p-3.5 ${pref.bg} rounded-xl border ${pref.border}`}
                    >
                      <pref.icon className={`w-4 h-4 ${pref.color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">{pref.label}</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{pref.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500 rounded-2xl text-white shadow-xl relative overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="relative flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold mb-0.5 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Your Research Impact
                    </h3>
                    <p className="text-sm opacity-90">
                      Analyzed {formatNumber(stats?.totalPublications || 0)} papers & {formatNumber(stats?.totalTrials || 0)} trials
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{stats?.conversationCount || 0}</p>
                    <p className="text-xs opacity-75">Research Sessions</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;