import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Search, Zap, Shield, CheckCircle, ArrowRight,
  Sparkles, BookOpen, FlaskConical, Globe, Star,
  ChevronRight, Activity, TrendingUp, Users, Heart,
  Clock, BarChart3, Eye, Play, ArrowUpRight,
  MessageSquare, Layers, Database, Lock
} from 'lucide-react';
import Button from '@/components/ui/Button';

// ── Typewriter effect ─────────────────────────────────────
const TypeWriter = ({ words, className }) => {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx % words.length];
    const speed = deleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!deleting) {
        setText(word.substring(0, text.length + 1));
        if (text === word) setTimeout(() => setDeleting(true), 2000);
      } else {
        setText(word.substring(0, text.length - 1));
        if (text === '') { setDeleting(false); setIdx(i => i + 1); }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [text, deleting, idx, words]);

  return (
    <span className={className}>
      {text}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[3px] h-[1em] bg-current ml-1 align-middle"
      />
    </span>
  );
};

// ── Animated counter ──────────────────────────────────────
const Counter = ({ end, suffix = '', prefix = '' }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const num = parseInt(end) || 0;
    if (!num) return;
    let c = 0;
    const step = Math.max(1, Math.ceil(num / 40));
    const t = setInterval(() => {
      c += step;
      if (c >= num) { setN(num); clearInterval(t); } else setN(c);
    }, 20);
    return () => clearInterval(t);
  }, [inView, end]);

  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
};

// ── Morphing blob ─────────────────────────────────────────
const MorphBlob = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '70% 30% 30% 70% / 70% 70% 30% 30%', '30% 70% 70% 30% / 30% 30% 70% 70%'],
      x: [0, 30, -20, 0],
      y: [0, -25, 15, 0],
    }}
    transition={{ duration: 12 + delay * 3, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

// ── Floating UI card ──────────────────────────────────────
const FloatingCard = ({ children, className, delay = 0, x = 0, y = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay + 1, type: 'spring', damping: 15 }}
    className={`absolute hidden lg:block ${className}`}
    style={{ left: `${x}%`, top: `${y}%` }}
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay, ease: 'easeInOut' }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-3"
    >
      {children}
    </motion.div>
  </motion.div>
);

// ── Live activity pulse ───────────────────────────────────
const LivePulse = () => {
  const [activities] = useState([
    'Researcher in Mumbai searched "Lung Cancer Treatment"',
    'New clinical trial found in Kolkata, India',
    '8 publications analyzed for Alzheimer\'s query',
    'Vitamin D + Diabetes: 6 relevant papers found',
    'Heart Disease trials updated in Delhi region',
  ]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % activities.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-slate-500"
        >
          {activities[current]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// ── Bento card ────────────────────────────────────────────
const BentoCard = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay, type: 'spring', damping: 20 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-sm border border-slate-200/60 shadow-sm hover:shadow-xl transition-all ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
};

// ── MAIN LANDING ──────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ═══════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
          <MorphBlob className="w-[600px] h-[600px] bg-primary-200/15 -left-20 top-10" delay={0} />
          <MorphBlob className="w-[500px] h-[500px] bg-trust-200/12 right-0 top-20" delay={2} />
          <MorphBlob className="w-[400px] h-[400px] bg-purple-200/10 left-1/3 bottom-0" delay={4} />

          {/* Dot grid */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Floating UI previews */}
        <FloatingCard x={5} y={20} delay={0}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">8 Papers Found</p>
              <p className="text-xs text-slate-500">Lung Cancer Treatment</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={80} y={15} delay={1}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">63 Trials</p>
              <p className="text-xs text-slate-500">Recruiting in India</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={8} y={65} delay={2}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">AI Analysis</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active
              </p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={75} y={70} delay={3}>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            ))}
            <span className="text-xs text-slate-600 ml-1">4.9/5</span>
          </div>
        </FloatingCard>

        {/* Hero content */}
        <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative"
        >
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }} className="inline-block mb-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full border border-primary-100 shadow-lg">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                <Sparkles className="w-4 h-4 text-primary-500" />
              </motion.div>
              <span className="text-sm font-semibold text-slate-700">Open-Source AI Medical Research</span>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">NEW</span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', damping: 18 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6"
          >
            <span className="text-slate-900">Research</span>
            <br />
            <TypeWriter
              words={['Treatments', 'Clinical Trials', 'Researchers', 'Supplements']}
              className="bg-gradient-to-r from-primary-600 via-trust-600 to-purple-600 bg-clip-text text-transparent"
            />
            <br />
            <span className="text-slate-900">with AI</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Search <strong className="text-primary-600">10M+ papers</strong> from PubMed & OpenAlex,
            discover <strong className="text-purple-600">500K+ clinical trials</strong>,
            and get structured AI insights in seconds.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={() => navigate('/auth')} icon={ArrowRight} iconPosition="right" size="lg"
                className="text-lg px-10 py-5 shadow-xl shadow-primary-500/25"
              >
                Start Free Research
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={() => navigate('/auth')} variant="secondary" size="lg"
                icon={Play} className="text-lg px-8 py-5"
              >
                See It Work
              </Button>
            </motion.div>
          </motion.div>

          {/* Live activity */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="flex justify-center"
          >
            <LivePulse />
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-5 h-9 border-2 border-slate-300 rounded-full flex justify-center pt-2"
            >
              <motion.div
                animate={{ opacity: [1, 0], y: [0, 10] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-0.5 h-1.5 bg-slate-400 rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════
          DATA SOURCES
          ═══════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500 mb-6 font-medium uppercase tracking-wider">Powered by trusted sources</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {['PubMed (NIH)', 'OpenAlex', 'ClinicalTrials.gov', 'LLaMA 3.2'].map((src, i) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-slate-700 font-semibold text-sm md:text-base"
              >
                <Database className="w-4 h-4" />
                {src}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BENTO FEATURES
          ═══════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-sm font-bold text-primary-600 uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-4">
              Built for <span className="bg-gradient-to-r from-primary-600 to-trust-600 bg-clip-text text-transparent">real research</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to find treatments, trials, and insights — fast.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Large card */}
            <BentoCard className="md:col-span-2 md:row-span-2" delay={0.1}>
              <div className="p-8 h-full flex flex-col">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">AI-Powered Analysis</h3>
                <p className="text-slate-600 mb-6 max-w-md">
                  LLaMA 3.2 reads every paper, extracts key findings, and generates structured responses with citations. No hallucination — only real data.
                </p>
                {/* Mini demo */}
                <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-600">Live Analysis</span>
                  </div>
                  <div className="space-y-2">
                    {['Pembrolizumab: 44% response rate [1]', 'EGFR-TKI + chemo: PFS 30.9mo [4]', 'Nivolumab 240mg: pCR 43.3% [8]'].map((f, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700">{f}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Small cards */}
            <BentoCard delay={0.2}>
              <div className="p-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Hybrid Search</h3>
                <p className="text-sm text-slate-600">PubMed + OpenAlex + ClinicalTrials.gov in one query. 400+ results ranked.</p>
                <div className="mt-4 flex gap-2">
                  {['PubMed', 'OpenAlex'].map(s => (
                    <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-semibold">{s}</span>
                  ))}
                </div>
              </div>
            </BentoCard>

            <BentoCard delay={0.3}>
              <div className="p-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Location-Based Trials</h3>
                <p className="text-sm text-slate-600">Find recruiting clinical trials near you. India, US, UK — 60+ countries supported.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full w-fit">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  63 trials in India
                </div>
              </div>
            </BentoCard>

            <BentoCard delay={0.4}>
              <div className="p-6">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Intent-Aware Ranking</h3>
                <p className="text-sm text-slate-600">Not just keywords — understands if you want treatments, researchers, or supplements.</p>
              </div>
            </BentoCard>

            <BentoCard delay={0.5}>
              <div className="p-6">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Multi-Turn Context</h3>
                <p className="text-sm text-slate-600">"Can I take Vitamin D?" after asking about lung cancer? AI remembers and personalizes.</p>
              </div>
            </BentoCard>

            <BentoCard delay={0.6}>
              <div className="p-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Source Verified</h3>
                <p className="text-sm text-slate-600">Every finding cites real papers with title, authors, year, URL. Zero hallucination.</p>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-trust-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { end: 10, suffix: 'M+', label: 'Research Papers', icon: BookOpen },
              { end: 500, suffix: 'K+', label: 'Clinical Trials', icon: FlaskConical },
              { end: 400, suffix: '+', label: 'Papers Per Query', icon: Layers },
              { end: 10, suffix: 's', label: 'Avg Response', icon: Zap },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center text-white"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-3 opacity-70" />
                <p className="text-4xl md:text-5xl font-bold">
                  <Counter end={stat.end} suffix={stat.suffix} />
                </p>
                <p className="text-sm opacity-70 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIAL
          ═══════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, type: 'spring' }}>
                  <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
                </motion.div>
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed mb-8 italic">
              "Curalink finds papers I would have missed. The AI analysis saves me hours every week."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                DR
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900">Dr. Sarah Mitchell</p>
                <p className="text-sm text-slate-500">Oncology Researcher</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-purple-900" />
        <div className="absolute inset-0">
          <MorphBlob className="w-[500px] h-[500px] bg-primary-500/10 left-0 top-0" delay={0} />
          <MorphBlob className="w-[400px] h-[400px] bg-purple-500/10 right-0 bottom-0" delay={3} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-20 h-20 bg-gradient-to-br from-primary-500 to-trust-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-primary-500/40"
            >
              <Sparkles className="w-9 h-9 text-white" />
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-trust-400 bg-clip-text text-transparent">
                discover more?
              </span>
            </h2>
            <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
              Join researchers worldwide making better decisions with AI-powered medical research.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={() => navigate('/auth')} size="lg"
                icon={ArrowRight} iconPosition="right"
                className="text-lg px-12 py-6 bg-white text-primary-700 hover:bg-white/95 border-0 shadow-2xl"
              >
                Start Free — No Card Required
              </Button>
            </motion.div>
            <p className="text-sm text-white/40 mt-4 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Open source · No data sold · LLaMA 3.2 powered
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;