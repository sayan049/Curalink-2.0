import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Shield,
  Brain,
  Users,
  Zap,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import OTPVerification from "@/components/auth/OTPVerification";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";
import PageTransition from "@/components/animations/PageTransition";

// ─── Floating Orb Background ────────────────────────────────────────────────
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
      }}
      animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
      }}
      animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
      }}
      animate={{ scale: [1, 1.3, 1], y: [0, -30, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// ─── Grid Pattern ────────────────────────────────────────────────────────────
const GridPattern = () => (
  <div
    className="absolute inset-0 opacity-[0.03]"
    style={{
      backgroundImage: `
        linear-gradient(rgba(99,102,241,1) 1px, transparent 1px),
        linear-gradient(90deg, rgb(22, 62, 182) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
    }}
  />
);

// ─── Feature Card ────────────────────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, desc, delay, color }) => (
  <motion.div
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="group flex items-start gap-4 p-4 rounded-2xl bg-white/5 
               border border-white/10 hover:bg-white/10 hover:border-white/20 
               transition-all duration-300 backdrop-blur-sm"
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center 
                    flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
      style={{ background: color }}
    >
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-white font-semibold text-sm">{title}</p>
      <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

// ─── Stat Badge ──────────────────────────────────────────────────────────────
const StatBadge = ({ value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="text-center"
  >
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-white/60 text-xs mt-1">{label}</p>
  </motion.div>
);

// ─── Mode Toggle ─────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
  <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
    {["login", "register"].map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className="relative flex-1 py-2.5 text-sm font-semibold rounded-lg 
                   transition-colors duration-200 capitalize"
      >
        {mode === m && (
          <motion.div
            layoutId="modeIndicator"
            className="absolute inset-0 bg-white rounded-lg shadow-sm"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span
          className={`relative z-10 transition-colors duration-200 ${
            mode === m ? "text-slate-900" : "text-slate-500"
          }`}
        >
          {m === "login" ? "Sign In" : "Sign Up"}
        </span>
      </button>
    ))}
  </div>
);

// ─── Step Indicator ──────────────────────────────────────────────────────────
const StepIndicator = () => (
  <div className="flex items-center gap-2 mb-6">
    {[1, 2].map((step, i) => (
      <div key={step} className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{step}</span>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {step === 1 ? "Details" : "Verify Email"}
        </span>
        {i === 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
      </div>
    ))}
  </div>
);

// ─── Main Auth Page ──────────────────────────────────────────────────────────
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");

  const resetToken = searchParams.get("reset");
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    if (resetToken) setShowResetModal(true);
  }, [resetToken]);

  const handleResetModalClose = () => {
    setShowResetModal(false);
    searchParams.delete("reset");
    setSearchParams(searchParams);
  };

  const handleRegisterSuccess = (userEmail, name) => {
    setEmail(userEmail);
    setUserName(name);
    setMode("otp");
  };

  const handleBackToForm = () => {
    setMode("register");
    setEmail("");
    setUserName("");
  };

  const features = [
    {
      icon: Brain,
      title: "10M+ Research Publications",
      desc: "Access the world's largest medical literature database",
      color: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      delay: 0.4,
    },
    {
      icon: Shield,
      title: "500K+ Clinical Trials",
      desc: "Real-time trial data from global research institutions",
      color: "linear-gradient(135deg, #10b981, #059669)",
      delay: 0.5,
    },
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      desc: "Instant insights powered by advanced medical AI",
      color: "linear-gradient(135deg, #f59e0b, #d97706)",
      delay: 0.6,
    },
    {
      icon: Users,
      title: "Trusted by 50K+ Researchers",
      desc: "Join a global community of medical professionals",
      color: "linear-gradient(135deg, #3b82f6, #2563eb)",
      delay: 0.7,
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen flex bg-slate-50">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative">
          <FloatingOrbs />
          <GridPattern />

          {/* Back Button */}
          <div className="relative z-10 p-6">
            <motion.button
              onClick={() => navigate("/")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 
                         transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 
                              flex items-center justify-center shadow-sm
                              group-hover:border-slate-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Back to Home</span>
            </motion.button>
          </div>

          {/* Form Area */}
          <div className="flex-1 flex items-center justify-center px-6 pb-12 relative z-10">
            <div className="w-full max-w-[420px]">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="relative">
                  <div
                    className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 
                                  rounded-xl flex items-center justify-center shadow-lg 
                                  shadow-primary-200"
                  >
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 
                                  rounded-full border-2 border-white"
                  />
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900">
                    Curalink
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span
                      className="text-[10px] text-slate-400 font-medium uppercase 
                                     tracking-wider"
                    >
                      AI Medical Research
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 
                           border border-slate-100 p-8"
              >
                <AnimatePresence mode="wait">
                  {/* OTP Step */}
                  {mode === "otp" ? (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* OTP Header */}
                      <div className="mb-6">
                        <StepIndicator />
                        <div
                          className="w-12 h-12 rounded-xl bg-primary-50 flex items-center 
                                        justify-center mb-4"
                        >
                          <Lock className="w-6 h-6 text-primary-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                          Verify Your Email
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                          We sent a code to{" "}
                          <span className="font-semibold text-slate-700">
                            {email}
                          </span>
                        </p>
                      </div>

                      <OTPVerification
                        email={email}
                        isRegistration={true}
                        userName={userName}
                      />

                      <button
                        onClick={handleBackToForm}
                        className="mt-5 flex items-center gap-1.5 text-sm text-slate-500 
                                   hover:text-primary-600 transition-colors group"
                      >
                        <ArrowLeft
                          className="w-3.5 h-3.5 group-hover:-translate-x-0.5 
                                              transition-transform"
                        />
                        Back to registration
                      </button>
                    </motion.div>
                  ) : (
                    /* Login / Register Step */
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Mode Toggle */}
                      <ModeToggle mode={mode} onChange={setMode} />

                      {/* Header */}
                      <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">
                          {mode === "login"
                            ? "Welcome back 👋"
                            : "Create account ✨"}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                          {mode === "login"
                            ? "Sign in to continue your research journey"
                            : "Join thousands making informed healthcare decisions"}
                        </p>
                      </div>

                      {/* Forms */}
                      {mode === "login" ? (
                        <LoginForm />
                      ) : (
                        <RegisterForm onSuccess={handleRegisterSuccess} />
                      )}

                      {/* Switch Mode */}
                      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500">
                          {mode === "login"
                            ? "Don't have an account? "
                            : "Already have an account? "}
                          <button
                            onClick={() =>
                              setMode(mode === "login" ? "register" : "login")
                            }
                            className="font-semibold text-primary-600 hover:text-primary-700 
                                       transition-colors underline-offset-2 hover:underline"
                          >
                            {mode === "login" ? "Sign Up Free" : "Sign In"}
                          </button>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 flex items-center justify-center gap-2 text-slate-400"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="text-xs">
                  HIPAA Compliant · 256-bit Encryption · SOC 2 Certified
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Right Panel ─────────────────────────────────────────────────── */}
        <div
          className="hidden lg:flex w-[480px] xl:w-[520px] relative overflow-hidden
                        bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900"
        >
          {/* Background Layers */}
          <div className="absolute inset-0">
            {/* Mesh gradient */}
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: `
                  radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.4) 0%, transparent 50%),
                  radial-gradient(ellipse at 80% 80%, rgba(16,185,129,0.3) 0%, transparent 50%),
                  radial-gradient(ellipse at 60% 30%, rgba(59,130,246,0.2) 0%, transparent 40%)
                `,
              }}
            />

            {/* Floating blobs */}
            <motion.div
              className="absolute top-10 right-10 w-64 h-64 rounded-full 
                         bg-primary-500/10 blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-10 left-10 w-80 h-80 rounded-full 
                         bg-emerald-500/10 blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 10, repeat: Infinity }}
            />

            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
                `,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-10 w-full">
            {/* Top: Branding */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                              bg-white/10 border border-white/20 backdrop-blur-sm mb-8"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/80 text-xs font-medium">
                  Live · 50,000+ active researchers
                </span>
              </div>

              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                The Future of
                <br />
                <span
                  className="bg-gradient-to-r from-primary-300 to-emerald-300 
                                 bg-clip-text text-transparent"
                >
                  Medical Research
                </span>
              </h2>
              <p className="text-white/60 text-base leading-relaxed max-w-sm">
                Harness the power of AI to navigate millions of medical
                publications, clinical trials, and research insights —
                instantly.
              </p>
            </motion.div>

            {/* Middle: Features */}
            <div className="space-y-3 my-8">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>

            {/* Bottom: Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="pt-6 border-t border-white/10"
            >
              <div className="grid grid-cols-3 gap-4">
                <StatBadge value="99.9%" label="Uptime SLA" delay={0.9} />
                <StatBadge value="<2s" label="Avg. Response" delay={1.0} />
                <StatBadge value="4.9★" label="User Rating" delay={1.1} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={handleResetModalClose}
        token={resetToken}
      />
    </PageTransition>
  );
};

export default Auth;
