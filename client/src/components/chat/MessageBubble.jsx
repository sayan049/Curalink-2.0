import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  User, Bot, Copy, Check,
  BookOpen, FlaskConical, Lightbulb,
  FileText, ExternalLink, ChevronRight,
  Users, Award, Download, FileDown, Loader2,
  TrendingUp, BarChart3, Activity, Sparkles,
  Shield, CheckCircle, AlertTriangle, Star,
  ArrowUpRight, Layers, Eye, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { cn } from '@/utils/cn';
import { formatDate, copyToClipboard } from '@/utils/helpers';
import PublicationCard from '@/components/research/PublicationCard';
import ClinicalTrialCard from '@/components/research/ClinicalTrialCard';
import { exportConversationToPDF, exportConversationAsText } from '@/utils/exportChat';
import useUIStore from '@/store/uiStore';
import useChatStore from '@/store/chatStore';

const COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f97316', '#10b981'];

// ── Helpers ───────────────────────────────────────────────
const extractResearchers = (pubs) => {
  if (!pubs?.length) return [];
  const m = {};
  pubs.forEach(p => {
    (p.authors || []).forEach((a, i) => {
      if (!a || a.length < 3) return;
      const n = a.trim();
      if (!m[n]) m[n] = { name: n, count: 0, cites: 0, year: 0, lead: false, paper: null };
      m[n].count++;
      m[n].cites += p.citationCount || 0;
      if ((p.year || 0) > m[n].year) m[n].year = p.year;
      if (i === 0) { m[n].lead = true; m[n].paper = p; }
      if (!m[n].paper) m[n].paper = p;
    });
  });
  return Object.values(m).sort((a, b) => (b.cites + b.count * 5) - (a.cites + a.count * 5)).slice(0, 5);
};

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-lg text-xs">
      <p className="font-bold text-slate-700">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.fill || p.color }} className="font-semibold">{p.value}</p>)}
    </div>
  );
};

const Counter = ({ value }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const iv = useInView(ref, { once: true });
  useEffect(() => {
    if (!iv) return;
    const end = parseInt(value) || 0;
    let c = 0;
    const s = Math.max(1, Math.ceil(end / 25));
    const t = setInterval(() => { c += s; if (c >= end) { setN(end); clearInterval(t); } else setN(c); }, 25);
    return () => clearInterval(t);
  }, [iv, value]);
  return <span ref={ref}>{n}</span>;
};

// ── Export Button ─────────────────────────────────────────
const ExportBtn = ({ message, query }) => {
  const [open, setOpen] = useState(false);
  const { showToast } = useUIStore();
  const { currentConversation } = useChatStore();

  const run = (fn) => {
    setOpen(false);
    try {
      const c = { ...(currentConversation || {}), title: query || 'Research' };
      fn(c, [{ _id: 'u', role: 'user', content: query || '', createdAt: new Date().toISOString() }, message]);
      showToast('Exported!', 'success');
    } catch { showToast('Failed', 'error'); }
  };

  return (
    <div className="relative">
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-primary-300 hover:shadow transition-all"
      >
        <Download className="w-3.5 h-3.5" /><span>Export</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="absolute left-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-1.5"
            >
              <button onClick={() => run(exportConversationToPDF)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-left text-sm font-medium text-slate-700">
                <FileDown className="w-4 h-4 text-red-500" />PDF
              </button>
              <button onClick={() => run(exportConversationAsText)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-left text-sm font-medium text-slate-700">
                <FileText className="w-4 h-4 text-blue-500" />Text
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tab Button ────────────────────────────────────────────
const TabBtn = ({ active, icon: Icon, label, count, onClick }) => (
  <motion.button
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
      active
        ? 'bg-gradient-to-r from-primary-500 to-trust-500 text-white shadow-md shadow-primary-500/20'
        : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300'
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    <span>{label}</span>
    {count != null && (
      <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-bold',
        active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
      )}>{count}</span>
    )}
  </motion.button>
);

// ── MAIN RESPONSE CARD ────────────────────────────────────
const ResponseCard = ({ metadata, isResearcher }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const s = metadata?.structuredResponse || {};
  const pubs = metadata?.publications || [];
  const trials = metadata?.clinicalTrials || [];

  const snippets = s.sourceSnippets?.length > 0 ? s.sourceSnippets
    : pubs.slice(0, 5).map(p => ({
        title: p.title, authors: (p.authors || []).slice(0, 2).join(', '),
        year: p.year, platform: (p.source || '').toUpperCase(),
        url: p.url, snippet: (p.abstract || '').substring(0, 150),
      }));

  const yearData = useMemo(() => {
    const by = {};
    pubs.forEach(p => { if (p.year) by[p.year] = (by[p.year] || 0) + 1; });
    return Object.entries(by).sort(([a], [b]) => a - b).slice(-6).map(([y, c]) => ({ year: y, count: c }));
  }, [pubs]);

  const sourceData = useMemo(() => {
    const by = {};
    pubs.forEach(p => { by[(p.source || 'other').toUpperCase()] = (by[(p.source || 'other').toUpperCase()] || 0) + 1; });
    return Object.entries(by).map(([n, v]) => ({ name: n, value: v }));
  }, [pubs]);

  const tabs = [
    { id: 'summary', icon: Sparkles, label: 'Summary' },
    { id: 'findings', icon: Lightbulb, label: 'Findings', count: s.keyFindings?.length },
    { id: 'publications', icon: BookOpen, label: 'Papers', count: pubs.length },
    { id: 'trials', icon: FlaskConical, label: 'Trials', count: trials.length },
    { id: 'sources', icon: Layers, label: 'Sources', count: snippets.length },
  ];

  if (isResearcher && pubs.length > 0) {
    tabs.splice(2, 0, { id: 'researchers', icon: Users, label: 'Researchers', count: extractResearchers(pubs).length });
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-slate-200/70 shadow-lg overflow-hidden">

      {/* ── Stat Row ─── */}
      <div className="grid grid-cols-4 gap-px bg-slate-200/50">
        {[
          { icon: BookOpen, val: pubs.length, lbl: 'Papers', g: 'from-blue-500 to-cyan-500' },
          { icon: FlaskConical, val: trials.length, lbl: 'Trials', g: 'from-purple-500 to-violet-500' },
          { icon: Lightbulb, val: s.keyFindings?.length || 0, lbl: 'Findings', g: 'from-teal-500 to-green-500' },
          { icon: Activity, val: trials.filter(t => t.status === 'RECRUITING').length, lbl: 'Active', g: 'from-green-500 to-emerald-500' },
        ].map((item, idx) => (
          <motion.div
            key={item.lbl}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`bg-gradient-to-br ${item.g} p-3 text-white text-center`}
          >
            <item.icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold leading-none"><Counter value={item.val} /></p>
            <p className="text-xs opacity-70 mt-0.5">{item.lbl}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row ─── */}
      {(yearData.length > 1 || sourceData.length > 0) && (
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-slate-100">
          {yearData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="bg-slate-50/80 rounded-2xl p-3"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-xs font-bold text-slate-700">Timeline</p>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={yearData}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fill="url(#ag)"
                    dot={{ fill: '#0ea5e9', r: 2.5 }} activeDot={{ r: 4 }}
                    animationDuration={1800} animationBegin={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
          {sourceData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-slate-50/80 rounded-2xl p-3"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                <p className="text-xs font-bold text-slate-700">Sources</p>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={sourceData} barCategoryGap="25%">
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={1500} animationBegin={500}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Tab Navigation ─── */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 overflow-x-auto custom-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <TabBtn
              key={tab.id}
              active={activeTab === tab.id}
              icon={tab.icon}
              label={tab.label}
              count={tab.count}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Tab Content ─── */}
      <div className="p-4 min-h-[120px]">
        <AnimatePresence mode="wait">

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="space-y-4">
              {s.conditionOverview && (
                <div className="p-4 bg-gradient-to-r from-blue-50/70 to-sky-50/50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-slate-800">Overview</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.conditionOverview}</p>
                </div>
              )}
              {s.researchInsights && (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-bold text-slate-800">Research Insights</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{s.researchInsights}</p>
                </div>
              )}
              {s.clinicalTrialsSummary && (
                <div className="p-4 bg-gradient-to-r from-purple-50/70 to-violet-50/50 rounded-2xl border border-purple-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-bold text-slate-800">Clinical Trials</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.clinicalTrialsSummary}</p>
                </div>
              )}
              {s.recommendations?.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50/70 to-emerald-50/50 rounded-2xl border border-green-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-bold text-slate-800">Recommendations</p>
                  </div>
                  <ul className="space-y-2">
                    {s.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {s.safetyConsiderations?.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-red-50/60 to-orange-50/40 rounded-2xl border border-red-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-bold text-slate-800">Safety</p>
                  </div>
                  <ul className="space-y-2">
                    {s.safetyConsiderations.map((sc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{sc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Findings Tab */}
          {activeTab === 'findings' && (
            <motion.div key="findings" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
              {(s.keyFindings || []).map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 p-3 bg-gradient-to-r from-teal-50/60 to-cyan-50/40 rounded-xl border border-teal-200/50"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-slate-700 leading-relaxed">{f}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Researchers Tab */}
          {activeTab === 'researchers' && (
            <motion.div key="researchers" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-2.5">
              {extractResearchers(pubs).map((r, idx) => (
                <motion.div key={r.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07 }}
                  className="flex items-start gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-200/50 hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-sm">
                    {['🥇', '🥈', '🥉'][idx] || <span className="text-xs font-bold text-purple-600">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">{r.name}</p>
                      {r.lead && <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded font-bold">Lead</span>}
                    </div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{r.count} papers</span>
                      {r.cites > 0 && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-semibold">{r.cites} cited</span>}
                    </div>
                    {r.paper && (
                      <a href={r.paper.url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 block text-xs text-primary-600 hover:underline line-clamp-1">{r.paper.title}</a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Publications Tab */}
          {activeTab === 'publications' && (
            <motion.div key="publications" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-2.5">
              {pubs.map((p, i) => (
                <motion.div key={p.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <PublicationCard publication={p} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Trials Tab */}
          {activeTab === 'trials' && (
            <motion.div key="trials" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-2.5">
              {trials.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(() => {
                      const sc = {};
                      trials.forEach(t => { sc[t.status || 'Unknown'] = (sc[t.status || 'Unknown'] || 0) + 1; });
                      return Object.entries(sc).map(([st, ct]) => (
                        <span key={st} className={cn('text-xs px-2.5 py-1 rounded-full font-bold border',
                          st === 'RECRUITING' ? 'bg-green-50 text-green-700 border-green-200' :
                          st === 'ACTIVE_NOT_RECRUITING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          st=== 'COMPLETED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5',
                            st === 'RECRUITING' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                          )} />
                          {ct} {st.replace(/_/g, ' ')}
                        </span>
                      ));
                    })()}
                  </div>
                  {trials.map((t, i) => (
                    <motion.div key={t.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <ClinicalTrialCard trial={t} />
                    </motion.div>
                  ))}
                </>
              ) : <p className="text-sm text-slate-500 text-center py-8">No clinical trials found</p>}
            </motion.div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <motion.div key="sources" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-2.5">
              {snippets.map((src, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="group p-3 bg-white rounded-xl border border-slate-200/60 hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-primary-500 to-trust-500 rounded-full flex items-center justify-center text-xs font-bold text-white">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{src.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        {src.authors && <span>{src.authors}</span>}
                        {src.year && <><span className="text-slate-300">|</span><span className="font-bold text-slate-700">{src.year}</span></>}
                        {src.platform && (
                          <span className={cn('px-1.5 py-0.5 rounded font-bold',
                            src.platform === 'PUBMED' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                          )}>{src.platform}</span>
                        )}
                      </div>
                      {src.snippet && (
                        <p className="text-xs text-slate-500 mt-1.5 italic bg-slate-50 px-2 py-1 rounded border-l-2 border-primary-300 line-clamp-2">"{src.snippet}"</p>
                      )}
                    </div>
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Footer ─── */}
      {s.references && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{s.references.publicationCount || 0}</span>
            <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3" />{s.references.trialCount || 0}</span>
          </div>
          <span className="flex items-center gap-1 opacity-50"><Sparkles className="w-3 h-3" />LLaMA 3.1</span>
        </div>
      )}
    </div>
  );
};

// ── MAIN BUBBLE ───────────────────────────────────────────
const MessageBubble = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  const hasData = !isUser && !!message.metadata?.structuredResponse?.conditionOverview;
  const isRes = !!(message.metadata?.originalQuery || '').toLowerCase().match(/researcher|expert|scientist/);

  const plainText = (() => {
    if (hasData) return null;
    const c = message.content || '';
    try { JSON.parse(c); return null; } catch {
      const m = c.match(/\{[\s\S]*\}/);
      return m ? (c.replace(m[0], '').trim() || null) : (c || null);
    }
  })();

  // const handleCopy = async () => {
  //   if (await copyToClipboard(message.content)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  // };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.35, type: 'spring', damping: 22 }}
      className={cn('flex gap-3 mb-8', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <motion.div whileHover={{ scale: 1.1 }}
        className={cn('flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg',
          isUser ? 'bg-gradient-to-br from-primary-500 to-trust-500' : 'bg-gradient-to-br from-trust-500 to-purple-600'
        )}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </motion.div>

      <div className={cn('flex-1 max-w-4xl', isUser && 'flex justify-end')}>
        <div className={cn('space-y-2', isUser && 'text-right')}>

          <p className={cn('text-xs font-semibold flex items-center gap-1', isUser ? 'justify-end text-primary-600' : 'text-trust-600')}>
            {!isUser && <Sparkles className="w-3 h-3" />}
            {isUser ? 'You' : 'Curalink AI'}
          </p>

          {isUser && (
            <motion.div initial={{ scale: 0.95 }} animate={inView ? { scale: 1 } : {}}
              className="inline-block px-5 py-3 rounded-2xl rounded-tr-sm text-white max-w-lg shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </motion.div>
          )}

          {!isUser && (
            <div className="space-y-3">
              {plainText && (
                <div className="inline-block px-5 py-3 rounded-2xl rounded-tl-sm bg-white/80 backdrop-blur-xl border border-slate-200 max-w-2xl shadow-sm">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{plainText}</p>
                </div>
              )}

              {hasData && <ResponseCard metadata={message.metadata} isResearcher={isRes} />}

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="text-xs">
                  {message.metadata?.processingTime && (
                    <span className={cn('px-2 py-1 rounded-full font-bold',
                      message.metadata.processingTime < 30000 ? 'bg-green-100 text-green-700'
                        : message.metadata.processingTime < 60000 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-600'
                    )}>{(message.metadata.processingTime / 1000).toFixed(1)}s</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  
                  {(hasData || plainText) && <ExportBtn message={message} query={message.metadata?.originalQuery || ''} />}
                </div>
              </div>
            </div>
          )}

          <p className={cn('text-xs text-slate-400', isUser && 'text-right')}>{formatDate(message.createdAt)}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;