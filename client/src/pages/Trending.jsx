import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  TrendingUp, Search, BookOpen, FlaskConical,
  ArrowRight, Loader2, ExternalLink, Flame,
  MapPin, Users, X, Sparkles, Zap, Globe,
  ChevronRight, BarChart3, Star, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import PageTransition from '@/components/animations/PageTransition';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { researchService } from '@/services/researchService';
import { chatService } from '@/services/chatService';
import useUIStore from '@/store/uiStore';
import { formatNumber } from '@/utils/helpers';

const COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#f59e0b', '#6366f1', '#22d3ee', '#a855f7'];

const TOPIC_META = {
  "Alzheimer's Disease": { icon: '🧠', gradient: 'from-purple-500 to-violet-600', light: 'from-purple-50 to-violet-50', border: 'border-purple-200', text: 'text-purple-700', tags: ['Dementia', 'Neurology'] },
  'Cancer Immunotherapy': { icon: '🔬', gradient: 'from-red-500 to-rose-600', light: 'from-red-50 to-rose-50', border: 'border-red-200', text: 'text-red-700', tags: ['Oncology', 'CAR-T'] },
  'Type 2 Diabetes': { icon: '💉', gradient: 'from-blue-500 to-cyan-600', light: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-700', tags: ['Endocrinology', 'Metabolism'] },
  'Heart Disease': { icon: '❤️', gradient: 'from-pink-500 to-rose-600', light: 'from-pink-50 to-rose-50', border: 'border-pink-200', text: 'text-pink-700', tags: ['Cardiology', 'Hypertension'] },
  "Parkinson's Disease": { icon: '🫁', gradient: 'from-green-500 to-emerald-600', light: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', tags: ['Neurology', 'DBS'] },
  'COVID-19': { icon: '🦠', gradient: 'from-orange-500 to-amber-600', light: 'from-orange-50 to-amber-50', border: 'border-orange-200', text: 'text-orange-700', tags: ['Virology', 'Vaccine'] },
  'Mental Health': { icon: '🧘', gradient: 'from-teal-500 to-cyan-600', light: 'from-teal-50 to-cyan-50', border: 'border-teal-200', text: 'text-teal-700', tags: ['Psychiatry', 'Depression'] },
  'Gene Therapy': { icon: '🧬', gradient: 'from-indigo-500 to-blue-600', light: 'from-indigo-50 to-blue-50', border: 'border-indigo-200', text: 'text-indigo-700', tags: ['CRISPR', 'Genetics'] },
  'Obesity Treatment': { icon: '⚖️', gradient: 'from-yellow-500 to-orange-600', light: 'from-yellow-50 to-orange-50', border: 'border-yellow-200', text: 'text-yellow-700', tags: ['GLP-1', 'Bariatric'] },
  'Stroke Prevention': { icon: '🫀', gradient: 'from-cyan-500 to-blue-600', light: 'from-cyan-50 to-blue-50', border: 'border-cyan-200', text: 'text-cyan-700', tags: ['Neurology', 'Prevention'] },
};

const QUICK_LOCS = ['Kolkata, India', 'New York, USA', 'London, UK', 'Toronto, Canada'];

// ── Animated counter ──────────────────────────────────────
const Counter = ({ value }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const end = parseInt(value) || 0;
    if (!end) return;
    let c = 0;
    const s = Math.max(1, Math.ceil(end / 25));
    const t = setInterval(() => { c += s; if (c >= end) { setN(end); clearInterval(t); } else setN(c); }, 20);
    return () => clearInterval(t);
  }, [inView, value]);
  return <span ref={ref}>{formatNumber(n)}</span>;
};

// ── Chart tooltip ─────────────────────────────────────────
const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-xl text-xs">
      <p className="font-bold text-slate-700">{payload[0]?.payload?.name}</p>
      <p className="font-semibold text-primary-600">{formatNumber(payload[0]?.value)} papers</p>
    </div>
  );
};

// ── Topic Card ────────────────────────────────────────────
const TopicCard = ({ topic, index, onChat, onExpand, isExpanded, isChatOpen,
  pubData, loadingPub, chatLocation, setChatLocation, creating, onCreateChat, onCloseChat }) => {

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const meta = TOPIC_META[topic.topic] || {};

  const activityLevel =
    (topic.recentPublications || 0) > 50000 ? { label: 'Very High', color: 'bg-red-500', ring: 'ring-red-400' } :
    (topic.recentPublications || 0) > 20000 ? { label: 'High', color: 'bg-orange-500', ring: 'ring-orange-400' } :
    (topic.recentPublications || 0) > 5000 ? { label: 'Moderate', color: 'bg-yellow-500', ring: 'ring-yellow-400' } :
    { label: 'Growing', color: 'bg-green-500', ring: 'ring-green-400' };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', damping: 20 }}
      layout
    >
      <motion.div
        whileHover={{ y: -4 }}
        className={`rounded-3xl overflow-hidden transition-all duration-300 bg-white/80 backdrop-blur-sm ${
          isChatOpen ? `ring-2 ${meta.ring || 'ring-primary-300'} shadow-2xl` :
          isExpanded ? `shadow-xl border ${meta.border}` :
          'border border-slate-200/80 shadow-sm hover:shadow-lg'
        }`}
      >
        {/* ── Gradient Header ─── */}
        <div className={`bg-gradient-to-r ${meta.gradient} p-5 relative overflow-hidden`}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-16 h-16 bg-white/10 rounded-full" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                className="text-3xl"
              >
                {meta.icon}
              </motion.span>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{topic.topic}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {meta.tags?.map(tag => (
                    <span key={tag} className="text-xs bg-white/20 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity badge */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${activityLevel.color} animate-pulse`} />
              <span className="text-xs text-white font-medium">{activityLevel.label}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative flex items-center gap-4 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <p className="text-xl font-bold text-white leading-none">
                <Counter value={topic.recentPublications || 0} />
              </p>
              <p className="text-xs text-white/70 mt-0.5">Publications</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <p className="text-sm font-bold text-white">{topic.latestYear || new Date().getFullYear()}</p>
              <p className="text-xs text-white/70">Latest</p>
            </div>
          </div>
        </div>

        {/* ── Chat Setup Inline ─── */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`bg-gradient-to-r ${meta.light} border-t ${meta.border} overflow-hidden`}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    Start Research
                  </p>
                  <button onClick={onCloseChat} className="p-1 hover:bg-white/50 rounded-lg">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Research: {topic.topic}</p>
                    <p className="text-xs text-slate-500">AI-powered analysis</p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-trust-500" />
                    Location <span className="text-slate-400 font-normal">(for trials)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Kolkata, India"
                    value={chatLocation}
                    onChange={(e) => setChatLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {QUICK_LOCS.map(loc => (
                      <button
                        key={loc}
                        onClick={() => setChatLocation(loc)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                          chatLocation === loc
                            ? 'bg-trust-100 text-trust-700 border-trust-300 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {chatLocation && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2 bg-trust-50 rounded-xl border border-trust-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-trust-600" />
                    <p className="text-xs text-trust-700">Trials near <strong>{chatLocation}</strong></p>
                  </motion.div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={onCloseChat}
                    className="flex-1 px-3 py-2.5 text-sm font-medium text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Button onClick={() => onCreateChat(topic)} loading={creating} icon={ArrowRight}
                    iconPosition="right" className="flex-1 text-sm" size="sm"
                  >
                    Start
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Expanded Research Data ─── */}
        <AnimatePresence>
          {isExpanded && !isChatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`bg-gradient-to-r ${meta.light} border-t ${meta.border} overflow-hidden`}
            >
              <div className="p-4">
                {loadingPub ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                  </div>
                ) : pubData ? (
                  <div className="space-y-4">
                    {pubData.stats && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Publications', value: formatNumber(pubData.stats.totalPublications || 0), icon: BookOpen },
                          { label: 'Trials', value: pubData.stats.clinicalTrialsCount || 0, icon: FlaskConical },
                          { label: 'Active', value: pubData.stats.activeTrials || 0, icon: Activity },
                        ].map((s, i) => (
                          <motion.div
                            key={s.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className="text-center bg-white rounded-xl p-3 shadow-sm border border-slate-100"
                          >
                            <s.icon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                            <p className="text-lg font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {pubData.publications?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Recent Papers
                        </p>
                        <div className="space-y-1.5">
                          {pubData.publications.slice(0, 3).map((pub, i) => (
                            <motion.a
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-100 hover:border-primary-300 hover:shadow-sm transition-all group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800 group-hover:text-primary-600 line-clamp-2 leading-snug">
                                  {pub.title}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {pub.authors?.[0]} {pub.year ? `· ${pub.year}` : ''}
                                </p>
                              </div>
                              <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.a>
                          ))}
                        </div>
                      </div>
                    )}

                    {pubData.stats?.topAuthors?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Top Researchers
                        </p>
                        <div className="space-y-1">
                          {pubData.stats.topAuthors.slice(0, 3).map((author, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex justify-between items-center text-xs bg-white rounded-lg px-3 py-2 border border-slate-100"
                            >
                              <span className="text-slate-700 truncate font-medium">{author.author}</span>
                              <span className="text-slate-400 ml-2 flex-shrink-0 flex items-center gap-1">
                                <Star className="w-3 h-3" /> {author.publications}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No data available</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ─── */}
        {!isChatOpen && (
          <div className="px-5 pb-4 pt-3 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onExpand(topic.topic)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              {isExpanded ? 'Hide' : 'Explore'}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </motion.button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button onClick={() => onChat(topic)} size="sm" className="w-full text-xs"
                icon={Zap} iconPosition="right"
              >
                Research
              </Button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────
const Trending = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const [topics, setTopics] = useState([]);
  const [topicPubs, setTopicPubs] = useState({});
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingPubs, setLoadingPubs] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [chatTopic, setChatTopic] = useState(null);
  const [chatLoc, setChatLoc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTopics(); }, []);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await researchService.getTrending();
      const data = Array.isArray(res?.data || res) ? (res?.data || res) : [];
      setTopics(Object.keys(TOPIC_META).map(name => ({
        topic: name,
        ...TOPIC_META[name],
        recentPublications: data.find(d => d.topic === name)?.recentPublications || 0,
        latestYear: data.find(d => d.topic === name)?.latestYear || new Date().getFullYear(),
      })));
    } catch {
      setTopics(Object.keys(TOPIC_META).map(name => ({ topic: name, ...TOPIC_META[name], recentPublications: 0 })));
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchPubs = async (name) => {
    if (topicPubs[name]) return;
    setLoadingPubs(p => ({ ...p, [name]: true }));
    try {
      const [stats, pubs] = await Promise.all([
        researchService.getStats(name).catch(() => null),
        researchService.searchOpenAlex({ query: name, perPage: 5 }).catch(() => null),
      ]);
      setTopicPubs(p => ({ ...p, [name]: { stats: stats?.data || stats, publications: pubs?.data?.slice(0, 5) || [] } }));
    } catch {
      setTopicPubs(p => ({ ...p, [name]: { stats: null, publications: [] } }));
    } finally {
      setLoadingPubs(p => ({ ...p, [name]: false }));
    }
  };

  const handleExpand = async (name) => {
    setExpanded(expanded === name ? null : name);
    if (expanded !== name) await fetchPubs(name);
  };

  const handleChat = (t) => { setChatTopic(chatTopic === t.topic ? null : t.topic); setChatLoc(''); };
  const handleCloseChat = () => { setChatTopic(null); setChatLoc(''); };

  const handleCreate = async (t) => {
    setCreating(true);
    try {
      const res = await chatService.createConversation({ title: `Research: ${t.topic}`, disease: t.topic, location: chatLoc || undefined });
      handleCloseChat();
      navigate(`/chat/${res.data._id}`);
      showToast(`Started: ${t.topic}`, 'success');
    } catch { showToast('Failed to create chat', 'error'); }
    finally { setCreating(false); }
  };

  const filtered = topics.filter(t =>
    t.topic.toLowerCase().includes(search.toLowerCase()) ||
    t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const chartData = topics.slice(0, 8).map(t => ({
    name: t.topic.split(' ')[0],
    value: t.recentPublications || 0,
  })).filter(d => d.value > 0);

  return (
    <PageTransition>
      <div className="relative min-h-screen">
        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-100/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-trust-100/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }} className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-r from-primary-500 to-trust-500 rounded-2xl shadow-lg shadow-primary-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-trust-600 bg-clip-text text-transparent">
                  Trending Research
                </h1>
                <p className="text-sm text-slate-500">Discover active medical research worldwide</p>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="relative mb-6"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Search topics, tags..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none bg-white/80 backdrop-blur-sm shadow-sm"
            />
          </motion.div>

          {/* Hot tags */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="mb-6 p-4 bg-gradient-to-r from-orange-50/80 to-red-50/80 backdrop-blur-sm rounded-2xl border border-orange-200/60 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-800 text-sm">Hot Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['GLP-1', 'AI in Medicine', 'Long COVID', 'CRISPR', 'CAR-T'].map(tag => (
                <motion.button key={tag} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setSearch(tag)}
                  className="px-3 py-1.5 bg-white text-orange-700 text-xs font-semibold rounded-full border border-orange-200 hover:bg-orange-50 hover:shadow-sm transition-all"
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Overview chart */}
          {chartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-primary-100 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                </div>
                <h3 className="font-bold text-slate-800">Research Volume Overview</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barCategoryGap="15%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={2000} animationBegin={300}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Topic Cards */}
          {loadingTopics ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" text="Loading trending topics..." />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((topic, idx) => (
                <TopicCard
                  key={topic.topic}
                  topic={topic}
                  index={idx}
                  onChat={handleChat}
                  onExpand={handleExpand}
                  isExpanded={expanded === topic.topic}
                  isChatOpen={chatTopic === topic.topic}
                  pubData={topicPubs[topic.topic]}
                  loadingPub={loadingPubs[topic.topic]}
                  chatLocation={chatLoc}
                  setChatLocation={setChatLoc}
                  creating={creating}
                  onCreateChat={handleCreate}
                  onCloseChat={handleCloseChat}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 && !loadingTopics && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No topics match "{search}"</p>
              <button onClick={() => setSearch('')} className="mt-2 text-primary-600 text-sm font-semibold hover:underline">
                Clear search
              </button>
            </motion.div>
          )}

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 p-6 bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500 rounded-2xl text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <Globe className="w-5 h-5" /> Explore More
                </h3>
                <p className="text-sm opacity-90">Create a custom research chat on any medical topic</p>
              </div>
              <Button onClick={() => navigate('/chat')} variant="secondary" icon={ArrowRight} iconPosition="right"
                className="bg-white text-primary-600 hover:bg-white/90 border-0 shadow-lg"
              >
                Start Research
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Trending;