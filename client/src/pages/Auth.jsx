import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowLeft, Shield, Brain, Zap,
  Lock, ChevronRight, Sparkles, BookOpen, Globe,
  CheckCircle, FlaskConical, Search, Star,
  ArrowRight, TrendingUp, Database,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginForm          from '@/components/auth/LoginForm';
import RegisterForm       from '@/components/auth/RegisterForm';
import OTPVerification    from '@/components/auth/OTPVerification';
import ResetPasswordModal from '@/components/auth/ResetPasswordModal';
import PageTransition     from '@/components/animations/PageTransition';

// ═══════════════════════════════════════════════════════════════════════════════
// MORPHING BLOB — same as landing page
// ═══════════════════════════════════════════════════════════════════════════════

const MorphBlob = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
    animate={{
      borderRadius: [
        '30% 70% 70% 30% / 30% 30% 70% 70%',
        '70% 30% 30% 70% / 70% 70% 30% 30%',
        '30% 70% 70% 30% / 30% 30% 70% 70%',
      ],
      x: [0, 30, -20, 0],
      y: [0, -25, 15, 0],
    }}
    transition={{ duration: 12 + delay * 3, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PREVIEW CARD — same pattern as landing hero
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingPreview = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay + 0.8, type: 'spring', damping: 15 }}
    className={`absolute hidden xl:block ${className}`}
  >
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl
                 border border-white/50 p-3"
    >
      {children}
    </motion.div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE ACTIVITY — rotating research activities
// ═══════════════════════════════════════════════════════════════════════════════

const LiveActivity = () => {
  const activities = [
    '8 publications found for Lung Cancer treatment',
    'Clinical trial recruiting in Mumbai, India',
    'Vitamin D safety analyzed for diabetes patients',
    'Phase 3 RCT ranked #1 by evidence hierarchy',
    'Heart disease trials filtered for Kolkata region',
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % activities.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full
                         rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-slate-500"
        >
          {activities[current]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MINI STAT — inline stat badge
// ═══════════════════════════════════════════════════════════════════════════════

const MiniStat = ({ icon: Icon, value, label, gradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', damping: 20 }}
    whileHover={{ y: -2, scale: 1.02 }}
    className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm
               border border-slate-200/60 shadow-sm hover:shadow-lg
               transition-all duration-300 p-4 text-center cursor-default"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className={`relative w-9 h-9 rounded-xl mx-auto mb-2.5 flex items-center
                     justify-center shadow-md bg-gradient-to-r ${gradient}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="relative text-xl font-bold text-slate-900">{value}</p>
    <p className="relative text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
      {label}
    </p>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE PILL — horizontal badge
// ═══════════════════════════════════════════════════════════════════════════════

const FeaturePill = ({ icon: Icon, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 300 }}
    whileHover={{ scale: 1.05 }}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default"
    style={{ background: `${color}08`, border: `1px solid ${color}18` }}
  >
    <Icon className="w-3 h-3" style={{ color }} />
    <span className="text-[10px] font-semibold" style={{ color }}>
      {label}
    </span>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MODE TOGGLE — matches landing button style
// ═══════════════════════════════════════════════════════════════════════════════

const ModeToggle = ({ mode, onChange }) => (
  <div className="flex bg-slate-100/80 backdrop-blur-sm rounded-2xl p-1.5 mb-8">
    {['login', 'register'].map(m => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(m)}
        className="relative flex-1 py-3 text-sm font-semibold rounded-[14px]
                   transition-colors duration-200"
      >
        {mode === m && (
          <motion.div
            layoutId="authModePill"
            className="absolute inset-0 bg-white rounded-[14px]
                       shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className={`relative z-10 transition-colors duration-200 ${
          mode === m ? 'text-slate-900' : 'text-slate-400'
        }`}>
          {m === 'login' ? 'Sign In' : 'Create Account'}
        </span>
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// OTP STEP INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

const StepIndicator = () => (
  <div className="flex items-center gap-3 mb-7">
    {[
      { n: 1, label: 'Details', done: true },
      { n: 2, label: 'Verify Email', done: false },
    ].map(({ n, label, done }, i) => (
      <div key={n} className="flex items-center gap-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 400 }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold
            ${done
              ? 'bg-gradient-to-r from-primary-500 to-trust-500 text-white shadow-md shadow-primary-200'
              : 'bg-slate-100 text-slate-400 ring-2 ring-slate-200'
            }`}
        >
          {done ? <CheckCircle className="w-4 h-4" /> : n}
        </motion.div>
        <span className={`text-xs font-medium ${done ? 'text-slate-700' : 'text-slate-400'}`}>
          {label}
        </span>
        {i === 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-0.5" />}
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AUTH PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [userName, setUserName] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const resetToken = searchParams.get('reset');

  useEffect(() => {
    if (resetToken) setShowResetModal(true);
  }, [resetToken]);

  const handleResetModalClose = () => {
    setShowResetModal(false);
    searchParams.delete('reset');
    setSearchParams(searchParams);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">

        {/* ── Background — matches landing page ───────────────────────── */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
          <MorphBlob className="w-[600px] h-[600px] bg-primary-200/15 -left-40 -top-20" delay={0} />
          <MorphBlob className="w-[500px] h-[500px] bg-trust-200/12 -right-20 top-40" delay={2} />
          <MorphBlob className="w-[400px] h-[400px] bg-purple-200/10 left-1/3 -bottom-20" delay={4} />

          {/* Dot grid — same as landing */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* ── Floating preview cards — same as landing hero ────────── */}
        <FloatingPreview className="left-[3%] top-[15%]" delay={0}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">8 Papers Found</p>
              <p className="text-[10px] text-slate-500">Lung Cancer Treatment</p>
            </div>
          </div>
        </FloatingPreview>

        <FloatingPreview className="right-[3%] top-[20%]" delay={1}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">63 Trials</p>
              <p className="text-[10px] text-slate-500">Recruiting in India</p>
            </div>
          </div>
        </FloatingPreview>

        <FloatingPreview className="left-[5%] bottom-[18%]" delay={2}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">AI Analysis</p>
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active
              </p>
            </div>
          </div>
        </FloatingPreview>

        <FloatingPreview className="right-[4%] bottom-[22%]" delay={3}>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            ))}
            <span className="text-xs text-slate-600 ml-1 font-semibold">4.9</span>
          </div>
        </FloatingPreview>

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5">
          {/* Back */}
          <motion.button
            type="button"
            onClick={() => navigate('/')}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-400
                       hover:text-slate-700 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm
                            border border-slate-200/60 shadow-sm
                            flex items-center justify-center
                            group-hover:shadow-md group-hover:border-slate-300
                            transition-all duration-300">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Home</span>
          </motion.button>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-10 h-10 bg-gradient-to-br from-primary-500 to-trust-500
                         rounded-xl shadow-lg shadow-primary-200/50
                         flex items-center justify-center"
            >
              <Activity className="w-5 h-5 text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <p className="text-lg font-bold text-slate-900 leading-none tracking-tight">
                Curalink
              </p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-[0.15em] mt-0.5">
                AI Medical Research
              </p>
            </div>
          </motion.div>

          {/* Sources */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center gap-3 text-[10px] text-slate-400 font-medium"
          >
            {['PubMed', 'OpenAlex', 'ClinicalTrials.gov'].map(s => (
              <div key={s} className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{s}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Main content ────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center justify-center
                        min-h-[calc(100vh-80px)] px-4 pb-8">

          {/* Feature pills — above the card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {[
              { icon: Brain,      label: '10M+ Papers',       color: '#6366f1' },
              { icon: Globe,      label: 'Location-First',    color: '#14b8a6' },
              { icon: Zap,        label: 'Evidence Ranked',   color: '#f59e0b' },
              { icon: BookOpen,   label: 'Zero Hallucination', color: '#8b5cf6' },
            ].map((f, i) => (
              <FeaturePill key={f.label} {...f} delay={0.3 + i * 0.08} />
            ))}
          </motion.div>

          {/* Auth card — Bento style like landing */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-[440px] relative"
          >
            {/* Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl
                            border border-slate-200/60 shadow-xl
                            hover:shadow-2xl transition-shadow duration-500">

              {/* Top gradient accent */}
              <div className="h-1 bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500" />

              <div className="p-8 sm:p-10">
                <AnimatePresence mode="wait">

                  {/* ── OTP Step ───────────────────────────── */}
                  {mode === 'otp' ? (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <StepIndicator />

                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-purple-50
                                      flex items-center justify-center mb-5
                                      ring-1 ring-primary-100 shadow-sm">
                        <Lock className="w-6 h-6 text-primary-600" />
                      </div>

                      <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">
                        Check your inbox
                      </h1>
                      <p className="text-sm text-slate-500 mt-2 mb-7 leading-relaxed">
                        We sent a 6-digit code to{' '}
                        <span className="font-semibold text-slate-700 bg-primary-50 px-2 py-0.5 rounded-md">
                          {email}
                        </span>
                      </p>

                      <OTPVerification email={email} isRegistration userName={userName} />

                      <button
                        type="button"
                        onClick={() => { setMode('register'); setEmail(''); setUserName(''); }}
                        className="mt-6 flex items-center gap-2 text-sm text-slate-400
                                   hover:text-primary-600 transition-colors group"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Back to registration
                      </button>
                    </motion.div>

                  ) : (
                    /* ── Login / Register ──────────────────── */
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {/* Heading */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="mb-7"
                      >
                        <h1 className="text-[30px] font-extrabold text-slate-900 tracking-tight leading-none">
                          {mode === 'login' ? 'Welcome back' : 'Get started'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-2.5 leading-relaxed">
                          {mode === 'login'
                            ? 'Sign in to continue your medical research'
                            : 'Create your free account in 30 seconds'}
                        </p>
                      </motion.div>

                      {/* Mode toggle */}
                      <ModeToggle mode={mode} onChange={setMode} />

                      {/* Form */}
                      {mode === 'login'
                        ? <LoginForm />
                        : <RegisterForm onSuccess={(e, n) => {
                            setEmail(e); setUserName(n); setMode('otp');
                          }} />
                      }

                      {/* Switch mode */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 pt-6 border-t border-slate-100 text-center"
                      >
                        <p className="text-sm text-slate-500">
                          {mode === 'login' ? "New to Curalink? " : 'Already have an account? '}
                          <button
                            type="button"
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="font-semibold bg-gradient-to-r from-primary-600 to-trust-600
                                       bg-clip-text text-transparent
                                       hover:from-primary-700 hover:to-trust-700
                                       transition-all underline-offset-2 hover:underline"
                          >
                            {mode === 'login' ? 'Create free account' : 'Sign in instead'}
                          </button>
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Live activity — below card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 mb-8"
          >
            <LiveActivity />
          </motion.div>

          {/* Mini stats row — bento style like landing */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-4 gap-3 w-full max-w-[500px]"
          >
            <MiniStat
              icon={BookOpen}     value="10M+"   label="Papers"
              gradient="from-primary-500 to-cyan-500"  delay={0.75}
            />
            <MiniStat
              icon={FlaskConical} value="500K+"  label="Trials"
              gradient="from-purple-500 to-violet-500" delay={0.85}
            />
            <MiniStat
              icon={TrendingUp}   value="13"     label="Intents"
              gradient="from-orange-500 to-red-500"    delay={0.95}
            />
            <MiniStat
              icon={Zap}          value="<10s"   label="Response"
              gradient="from-green-500 to-emerald-500" delay={1.05}
            />
          </motion.div>

          {/* Trust strip — matches landing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-8 flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] text-slate-400 font-medium tracking-wider">
              HIPAA · 256-BIT · SOC 2 · OPEN SOURCE
            </span>
          </motion.div>
        </div>
      </div>

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={handleResetModalClose}
        token={resetToken}
      />
    </PageTransition>
  );
};

export default Auth;