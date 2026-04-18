import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  MessageSquare, TrendingUp, BookOpen, Activity,
  Clock, BarChart3, ArrowRight, Plus, ChevronRight,
  Sparkles, Brain, FlaskConical, Search, Zap,
  Globe, Users, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar
} from 'recharts';
import PageTransition from '@/components/animations/PageTransition';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useAuthStore from '@/store/authStore';
import useChatStore from '@/store/chatStore';
import api from '@/services/api';
import { formatNumber, formatDate } from '@/utils/helpers';
import { chatService } from '@/services/chatService';
import { researchService } from '@/services/researchService';

const COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f97316', '#10b981', '#ec4899'];

// ── Animated counter ──────────────────────────────────────
const Counter = ({ value, suffix = '' }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const end = parseInt(value) || 0;
    if (!end) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(end / 30));
    const t = setInterval(() => {
      cur += step;
      if (cur >= end) { setN(end); clearInterval(t); } else setN(cur);
    }, 25);
    return () => clearInterval(t);
  }, [inView, value]);

  return <span ref={ref}>{typeof value === 'string' ? value : formatNumber(n)}{suffix}</span>;
};

// ── Chart tooltip ─────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-xl text-xs">
      <p className="font-bold text-slate-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
          {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Floating particle ─────────────────────────────────────
const Particle = ({ delay, x, size }) => (
  <motion.div
    className="absolute rounded-full bg-primary-300/15"
    style={{ width: size, height: size, left: `${x}%` }}
    animate={{ y: [0, -80, -160], opacity: [0, 0.5, 0], scale: [0.5, 1, 0.3] }}
    transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeOut' }}
  />
);

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { setConversations, setCurrentConversation, clearMessages } = useChatStore();

  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetchData();
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.data);
      setRecentActivity(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const fetchData = async () => {
    setLoadingStats(true);
    try {
      const [statsRes, trendingRes] = await Promise.all([
        api.get('/user/stats').catch(() => ({ data: { data: null } })),
        researchService.getTrending().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data.data);
      const td = trendingRes?.data || trendingRes || [];
      setTrending(Array.isArray(td) ? td : []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    clearMessages();
    navigate('/chat');
  };

  // Build chart data from trending
  const trendingChartData = trending.slice(0, 6).map(t => ({
    name: t.topic?.split(' ')[0] || 'Topic',
    value: t.recentPublications || 0,
  }));

  return (
    <PageTransition>
      <div className="relative min-h-screen">

        {/* Background effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-trust-100/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-purple-100/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />
          {[...Array(5)].map((_, i) => (
            <Particle key={i} delay={i * 2.5} x={15 + i * 18} size={4 + i * 2} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Hero Header ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="mb-8"
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  {greeting}
                </motion.p>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  <span className="bg-gradient-to-r from-primary-600 via-trust-600 to-purple-600 bg-clip-text text-transparent">
                    {user?.name?.split(' ')[0] || 'Researcher'}
                  </span>
                </h1>
                <p className="text-slate-600 mt-1 max-w-lg">
                  {recentActivity.length > 0
                    ? `${recentActivity.length} active research conversation${recentActivity.length > 1 ? 's' : ''}`
                    : 'Start your medical research journey today'}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button onClick={handleNewChat} icon={Plus} size="lg">
                  New Research
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* ── Stats Row ───────────────────────────────────── */}
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading your research data..." />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: MessageSquare, value: stats.conversationCount || 0, label: 'Conversations', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
                { icon: BookOpen, value: stats.totalPublications || 0, label: 'Publications', gradient: 'from-teal-500 to-green-500', shadow: 'shadow-teal-500/20' },
                { icon: FlaskConical, value: stats.totalTrials || 0, label: 'Clinical Trials', gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/20' },
                { icon: BarChart3, value: stats.messageCount || 0, label: 'Messages', gradient: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/20' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.08, type: 'spring', damping: 15 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${stat.gradient} text-white shadow-xl ${stat.shadow} cursor-default`}
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
                  <div className="absolute -right-2 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />

                  <stat.icon className="w-5 h-5 mb-3 opacity-80" />
                  <p className="text-3xl font-bold leading-none">
                    <Counter value={stat.value} />
                  </p>
                  <p className="text-sm opacity-80 mt-1 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Quick Actions ───────────────────────────────── */}
          <div className="mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-primary-600" />
              Quick Actions
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Plus, title: 'New Chat', desc: 'Start a fresh research conversation', action: handleNewChat, gradient: 'from-primary-500 to-primary-600' },
                { icon: TrendingUp, title: 'Trending', desc: 'Explore popular medical topics', action: () => navigate('/trending'), gradient: 'from-trust-500 to-trust-600' },
                { icon: BookOpen, title: 'Library', desc: 'View all research history', action: () => navigate('/library'), gradient: 'from-purple-500 to-purple-600' },
              ].map((action, idx) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.action}
                  className="p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer group"
                >
                  <div className={`p-2.5 bg-gradient-to-r ${action.gradient} rounded-xl w-fit mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{action.desc}</p>
                  <div className="flex items-center gap-1 text-primary-600 text-sm font-semibold">
                    <span>Open</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Charts + Activity Row ──────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">

            {/* Trending Chart */}
            {trendingChartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-100 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-primary-600" />
                    </div>
                    <h3 className="font-bold text-slate-800">Research Volume by Topic</h3>
                  </div>
                  <button
                    onClick={() => navigate('/trending')}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    View All →
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trendingChartData} barCategoryGap="20%">
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => formatNumber(v)}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                      animationDuration={2000}
                      animationBegin={300}
                    >
                      {trendingChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Activity Ring */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Research Activity</h3>
                </div>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="90%"
                      data={[
                        { name: 'Papers', value: stats.totalPublications || 0, fill: '#0ea5e9' },
                        { name: 'Trials', value: stats.totalTrials || 0, fill: '#8b5cf6' },
                        { name: 'Chats', value: stats.conversationCount || 0, fill: '#14b8a6' },
                      ]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={6}
                        animationDuration={2000}
                        animationBegin={500}
                      />
                      <Tooltip content={<ChartTip />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {[
                    { color: '#0ea5e9', label: 'Papers' },
                    { color: '#8b5cf6', label: 'Trials' },
                    { color: '#14b8a6', label: 'Chats' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Bottom Row: Activity + Trending ────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Recent Activity</h3>
                </div>
                <button onClick={() => navigate('/library')} className="text-xs text-primary-600 font-semibold">
                  View All →
                </button>
              </div>

              <div className="space-y-2">
                {recentActivity.length > 0 ? (
                  recentActivity.map((conv, idx) => (
                    <motion.div
                      key={conv._id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      whileHover={{ x: 3 }}
                      onClick={() => navigate(`/chat/${conv._id}`)}
                      className="group p-3 bg-slate-50/80 hover:bg-primary-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-primary-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 text-sm truncate">{conv.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {conv.context?.disease && (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                                {conv.context.disease}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">{formatDate(conv.lastMessageAt)}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm text-slate-500 mb-3">No conversations yet</p>
                    <Button onClick={handleNewChat} icon={Plus} size="sm">Start Research</Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Trending Topics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Trending Topics</h3>
                </div>
                <button onClick={() => navigate('/trending')} className="text-xs text-primary-600 font-semibold">
                  View All →
                </button>
              </div>

              <div className="space-y-2">
                {trending.length > 0 ? (
                  trending.slice(0, 5).map((topic, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      whileHover={{ x: 3 }}
                      onClick={() => navigate('/trending')}
                      className="group p-3 bg-slate-50/80 hover:bg-orange-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-orange-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 text-sm truncate">{topic.topic}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-bold text-primary-600">{formatNumber(topic.recentPublications || 0)}</span>
                            {' '}publications
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            (topic.recentPublications || 0) > 50000 ? 'bg-red-500' :
                            (topic.recentPublications || 0) > 20000 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`} />
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm text-slate-500">Loading topics...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Bottom CTA ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 p-6 bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500 rounded-2xl text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -left-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />

            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Ready to discover?</h3>
                <p className="text-sm opacity-90">Search millions of papers and clinical trials worldwide</p>
              </div>
              <Button onClick={handleNewChat} variant="secondary" icon={Search} size="lg"
                className="bg-white text-primary-600 hover:bg-white/90 border-0 shadow-lg"
              >
                Start Researching
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;