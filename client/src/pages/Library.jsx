import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  BookOpen, Search, MessageSquare, Calendar,
  Trash2, FlaskConical, FileText,
  ArrowRight, Sparkles, Brain, MapPin,
  Clock, BarChart3, Zap, Filter,
  ChevronRight, Activity, Star, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import PageTransition from '@/components/animations/PageTransition';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { chatService } from '@/services/chatService';
import useUIStore from '@/store/uiStore';
import { formatDate, formatNumber } from '@/utils/helpers';

// ── Animated counter ──────────────────────────────────────
const Counter = ({ value }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const end = parseInt(value) || 0;
    if (!end) { setN(0); return; }
    let c = 0;
    const s = Math.max(1, Math.ceil(end / 25));
    const t = setInterval(() => { c += s; if (c >= end) { setN(end); clearInterval(t); } else setN(c); }, 20);
    return () => clearInterval(t);
  }, [inView, value]);
  return <span ref={ref}>{formatNumber(n)}</span>;
};

// ── Chart tooltip ─────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-xl text-xs">
      <p className="font-bold text-slate-700">{label}</p>
      <p className="text-primary-600 font-semibold">{payload[0]?.value} conversations</p>
    </div>
  );
};

// ── Conversation Card ─────────────────────────────────────
const ConvCard = ({ conv, index, onOpen, onDelete, isExpanded, onToggleExpand }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  const hasDisease = !!conv.context?.disease;
  const hasLocation = !!conv.context?.location;
  const pubCount = conv.metadata?.totalPublications || 0;
  const trialCount = conv.metadata?.totalClinicalTrials || 0;
  const msgCount = Math.floor((conv.metadata?.messageCount || 0) / 2);

  // Activity score for visual indicator
  const activityScore = Math.min(100, (pubCount * 2 + trialCount * 3 + msgCount * 5));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: 'spring', damping: 20 }}
    >
      <motion.div
        whileHover={{ y: -2, scale: 1.005 }}
        className={`rounded-2xl border-2 overflow-hidden bg-white/80 backdrop-blur-sm transition-all duration-200 ${
          isExpanded
            ? 'border-primary-300 shadow-xl shadow-primary-100/50'
            : 'border-slate-200/80 hover:border-primary-200 shadow-sm hover:shadow-md'
        }`}
      >
        {/* Main row */}
        <div
          className="p-4 flex items-start gap-4 cursor-pointer group"
          onClick={() => onOpen(conv._id)}
        >
          {/* Icon with gradient */}
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-trust-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20"
          >
            <MessageSquare className="w-5 h-5 text-white" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors text-sm md:text-base">
              {conv.title}
            </h3>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {hasDisease && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 text-xs rounded-full border border-primary-200 font-medium">
                  <Brain className="w-3 h-3" />
                  {conv.context.disease}
                </span>
              )}
              {hasLocation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 text-xs rounded-full border border-teal-200 font-medium">
                  <MapPin className="w-3 h-3" />
                  {conv.context.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {formatDate(conv.lastMessageAt)}
              </span>
            </div>

            {/* Stats mini row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {pubCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3 text-blue-500" />
                  {pubCount}
                </span>
              )}
              {trialCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                  <FlaskConical className="w-3 h-3 text-purple-500" />
                  {trialCount}
                </span>
              )}
              {msgCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                  <MessageSquare className="w-3 h-3 text-teal-500" />
                  {msgCount} msgs
                </span>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Activity mini bar */}
            {activityScore > 0 && (
              <div className="hidden sm:flex flex-col items-end gap-1 mr-2">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${activityScore}%` } : { width: 0 }}
                    transition={{ delay: index * 0.05 + 0.3, duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-primary-400 to-trust-400 rounded-full"
                  />
                </div>
                <span className="text-xs text-slate-400">Activity</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(conv._id); }}
              className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => onDelete(e, conv._id)}
              className="p-1.5 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </motion.button>

            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-all group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Expanded panel */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 bg-gradient-to-br from-slate-50/80 to-primary-50/30 border-t border-slate-100">
                <div className="pt-4 space-y-3">

                  {/* Research topics */}
                  {conv.context?.previousQueries?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                        Research Topics
                      </p>
                      <div className="space-y-1.5">
                        {conv.context.previousQueries.slice(-4).map((q, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-xl px-3 py-2 border border-slate-100"
                          >
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                            <span className="truncate">{q}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discovered entities */}
                  {conv.context?.entities && (() => {
                    const entities = [
                      ...(conv.context.entities.treatments || []).slice(0, 3),
                      ...(conv.context.entities.medications || []).slice(0, 2),
                    ].filter(Boolean);
                    return entities.length > 0 ? (
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                          Discovered Entities
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entities.map((entity, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="px-2.5 py-1 bg-white text-slate-700 text-xs rounded-xl border border-slate-200 font-medium shadow-sm"
                            >
                              {entity}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Research stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: FileText, value: pubCount, label: 'Papers', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { icon: FlaskConical, value: trialCount, label: 'Trials', color: 'text-purple-600', bg: 'bg-purple-50' },
                      { icon: MessageSquare, value: msgCount, label: 'Messages', color: 'text-teal-600', bg: 'bg-teal-50' },
                    ].map((s, i) => (
                      <div key={i} className="text-center bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                        <div className={`w-6 h-6 ${s.bg} rounded-lg mx-auto mb-1 flex items-center justify-center`}>
                          <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                        </div>
                        <p className="text-lg font-bold text-slate-900">{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => onOpen(conv._id)} size="sm" icon={ArrowRight}
                    iconPosition="right" className="w-full"
                  >
                    Continue Research
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// ── MAIN LIBRARY PAGE ─────────────────────────────────────
const Library = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchLibrary(); }, []);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await chatService.getConversations();
      setConversations(res.data || []);
    } catch { showToast('Failed to load library', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await chatService.deleteConversation(id);
      setConversations(p => p.filter(c => c._id !== id));
      if (expanded === id) setExpanded(null);
      showToast('Removed from library', 'success');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleToggleExpand = (id) => setExpanded(expanded === id ? null : id);

  const filters = [
    { key: 'all', label: 'All', icon: BookOpen },
    { key: 'recent', label: 'Recent', icon: Calendar },
    { key: 'with-research', label: 'Papers', icon: FileText },
    { key: 'with-trials', label: 'Trials', icon: FlaskConical },
  ];

  const filtered = conversations.filter(conv => {
    const q = search.toLowerCase();
    const matchesSearch =
      conv.title?.toLowerCase().includes(q) ||
      conv.context?.disease?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (activeFilter === 'recent') return new Date(conv.lastMessageAt) > new Date(Date.now() - 7 * 86400000);
    if (activeFilter === 'with-research') return (conv.metadata?.totalPublications || 0) > 0;
    if (activeFilter === 'with-trials') return (conv.metadata?.totalClinicalTrials || 0) > 0;
    return true;
  });

  const totalPubs = conversations.reduce((s, c) => s + (c.metadata?.totalPublications || 0), 0);
  const totalTrials = conversations.reduce((s, c) => s + (c.metadata?.totalClinicalTrials || 0), 0);
  const totalMsgs = conversations.reduce((s, c) => s + Math.floor((c.metadata?.messageCount || 0) / 2), 0);

  // Activity chart data (conversations by week)
  const chartData = (() => {
    const weeks = {};
    conversations.forEach(c => {
      const d = new Date(c.lastMessageAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      weeks[key] = (weeks[key] || 0) + 1;
    });
    return Object.entries(weeks).slice(-7).map(([date, count]) => ({ date, count }));
  })();

  return (
    <PageTransition>
      <div className="relative min-h-screen">

        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-100/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-primary-100/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }} className="mb-8"
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg shadow-purple-500/20">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                      My Library
                    </h1>
                    <p className="text-sm text-slate-500">Your research history & saved conversations</p>
                  </div>
                </div>
              </div>
              <Button onClick={() => navigate('/chat')} icon={Sparkles} size="md">
                New Research
              </Button>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: MessageSquare, value: conversations.length, label: 'Conversations', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
              { icon: FileText, value: totalPubs, label: 'Publications', gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/20' },
              { icon: FlaskConical, value: totalTrials, label: 'Trials', gradient: 'from-teal-500 to-green-500', shadow: 'shadow-teal-500/20' },
              { icon: Zap, value: totalMsgs, label: 'Messages', gradient: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/20' },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.07, type: 'spring', damping: 15 }}
                whileHover={{ y: -3, scale: 1.02 }}
                className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${stat.gradient} text-white shadow-xl ${stat.shadow}`}
              >
                <div className="absolute -right-3 -top-3 w-14 h-14 bg-white/10 rounded-full" />
                <stat.icon className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold leading-none"><Counter value={stat.value} /></p>
                <p className="text-xs opacity-75 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Activity Chart */}
          {chartData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Research Activity</h3>
                </div>
                <span className="text-xs text-slate-400">Last {chartData.length} days</span>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="libGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5}
                    fill="url(#libGrad)" dot={{ fill: '#8b5cf6', r: 3 }}
                    activeDot={{ r: 5 }} animationDuration={1800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Search conversations, diseases..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none bg-white/80 backdrop-blur-sm shadow-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {filters.map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    activeFilter === key
                      ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white/80 text-slate-600 border-2 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {key !== 'all' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      activeFilter === key ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {key === 'recent' ? conversations.filter(c => new Date(c.lastMessageAt) > new Date(Date.now() - 7 * 86400000)).length
                        : key === 'with-research' ? conversations.filter(c => (c.metadata?.totalPublications || 0) > 0).length
                        : conversations.filter(c => (c.metadata?.totalClinicalTrials || 0) > 0).length}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" text="Loading your library..." />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              >
                <BookOpen className="w-10 h-10 text-purple-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">
                {search ? 'No results found' : 'Your library is empty'}
              </h3>
              <p className="text-slate-500 mb-6">
                {search ? `No matches for "${search}"` : 'Start researching to build your library'}
              </p>
              <Button onClick={() => navigate('/chat')} icon={Sparkles}>
                Start Research
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {/* Result count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  <span className="font-bold text-slate-800">{filtered.length}</span> conversation{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Sorted by latest</span>
                </div>
              </div>

              {filtered.map((conv, idx) => (
                <ConvCard
                  key={conv._id}
                  conv={conv}
                  index={idx}
                  onOpen={(id) => navigate(`/chat/${id}`)}
                  onDelete={handleDelete}
                  isExpanded={expanded === conv._id}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 p-6 bg-gradient-to-r from-purple-500 via-violet-500 to-primary-500 rounded-2xl text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Continue Your Research</h3>
                  <p className="text-sm opacity-90">
                    {conversations.length} conversations · {totalPubs} papers · {totalTrials} trials analyzed
                  </p>
                </div>
                <Button onClick={() => navigate('/chat')} variant="secondary" icon={ArrowRight} iconPosition="right"
                  className="bg-white text-purple-600 hover:bg-white/90 border-0 shadow-lg"
                >
                  New Chat
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Library;