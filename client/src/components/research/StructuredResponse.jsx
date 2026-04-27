import { motion } from "framer-motion";
import {
  FileText,
  Lightbulb,
  Shield,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Users,
  Award,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  Quote,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ── Extract researchers ───────────────────────────────────
const extractTopResearchers = (publications) => {
  if (!publications || publications.length === 0) return [];
  const authorStats = {};

  publications.forEach((pub) => {
    if (!pub.authors || !Array.isArray(pub.authors)) return;
    pub.authors.forEach((author, authorIdx) => {
      if (!author || author === "Unknown" || author.trim().length < 3) return;
      const key = author.trim();
      if (!authorStats[key]) {
        authorStats[key] = {
          name: key,
          publications: [],
          totalCitations: 0,
          latestYear: 0,
          isFirstAuthor: false,
        };
      }
      authorStats[key].publications.push({
        title: pub.title,
        year: pub.year,
        url: pub.url,
        journal: pub.journalName,
      });
      authorStats[key].totalCitations += pub.citationCount || 0;
      if (pub.year > authorStats[key].latestYear)
        authorStats[key].latestYear = pub.year;
      if (authorIdx === 0) authorStats[key].isFirstAuthor = true;
    });
  });

  return Object.values(authorStats)
    .sort((a, b) => {
      const sA =
        a.totalCitations * 2 +
        a.publications.length * 10 +
        (a.isFirstAuthor ? 5 : 0);
      const sB =
        b.totalCitations * 2 +
        b.publications.length * 10 +
        (b.isFirstAuthor ? 5 : 0);
      return sB - sA;
    })
    .slice(0, 6);
};

// ── Simple section block ──────────────────────────────────
const Block = ({ icon: Icon, iconColor, title, accent, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25 }}
    className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
  >
    {/* Accent top bar */}
    <div className={cn("h-0.5 w-full", accent)} />

    <div className="p-4">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-1.5 rounded-lg bg-slate-50", iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <h5 className="font-bold text-slate-900 text-sm">{title}</h5>
      </div>

      {children}
    </div>
  </motion.div>
);

// ── Main component ────────────────────────────────────────
const StructuredResponse = ({ data, publications, isResearcherQuery }) => {
  const {
    conditionOverview,
    keyFindings,
    researchInsights,
    clinicalTrialsSummary,
    recommendations,
    safetyConsiderations,
    references,
    sourceSnippets,
  } = data;

  const topResearchers = isResearcherQuery
    ? extractTopResearchers(publications)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >

      {/* ── Overview ─────────────────────────────── */}
      {conditionOverview && (
        <Block
          icon={FileText}
          iconColor="text-blue-500"
          title="Condition Overview"
          accent="bg-gradient-to-r from-blue-400 to-cyan-400"
          delay={0}
        >
          <p className="text-sm text-slate-600 leading-relaxed">
            {conditionOverview}
          </p>
        </Block>
      )}

      {/* ── Researchers ──────────────────────────── */}
      {isResearcherQuery && topResearchers.length > 0 && (
        <Block
          icon={Users}
          iconColor="text-purple-500"
          title="Top Researchers"
          accent="bg-gradient-to-r from-purple-400 to-violet-400"
          delay={0.04}
        >
          <div className="space-y-2">
            {topResearchers.map((r, idx) => (
              <div
                key={r.name}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-purple-50 transition-colors"
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white",
                    idx === 0
                      ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                      : idx === 1
                        ? "bg-gradient-to-br from-slate-400 to-slate-500"
                        : idx === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-500"
                          : "bg-gradient-to-br from-purple-400 to-purple-500",
                  )}
                >
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">
                      {r.name}
                    </p>
                    {r.isFirstAuthor && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                        Lead
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {r.publications.length} papers
                    </span>
                    {r.totalCitations > 0 && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {r.totalCitations.toLocaleString()} cited
                      </span>
                    )}
                  </div>
                  {r.publications.slice(0, 1).map((pub, i) => (
                    <a
                      key={i}
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-start gap-1 text-xs text-primary-600 hover:underline line-clamp-1"
                    >
                      <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {pub.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ── Key Findings ─────────────────────────── */}
      {keyFindings && keyFindings.length > 0 && (
        <Block
          icon={Lightbulb}
          iconColor="text-teal-500"
          title="Key Findings"
          accent="bg-gradient-to-r from-teal-400 to-emerald-400"
          delay={0.06}
        >
          <ul className="space-y-2">
            {keyFindings.map((f, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm text-slate-700"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* ── Research Insights ────────────────────── */}
      {researchInsights && (
        <Block
          icon={TrendingUp}
          iconColor="text-indigo-500"
          title="Research Insights"
          accent="bg-gradient-to-r from-indigo-400 to-blue-400"
          delay={0.08}
        >
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {researchInsights}
          </p>
        </Block>
      )}

      {/* ── Clinical Trials ──────────────────────── */}
      {clinicalTrialsSummary && (
        <Block
          icon={FlaskConical}
          iconColor="text-purple-500"
          title="Clinical Trials"
          accent="bg-gradient-to-r from-purple-400 to-fuchsia-400"
          delay={0.1}
        >
          <p className="text-sm text-slate-600 leading-relaxed">
            {clinicalTrialsSummary}
          </p>
        </Block>
      )}

      {/* ── Recommendations ──────────────────────── */}
      {recommendations && recommendations.length > 0 && (
        <Block
          icon={CheckCircle}
          iconColor="text-green-500"
          title="Recommendations"
          accent="bg-gradient-to-r from-green-400 to-emerald-400"
          delay={0.12}
        >
          <ul className="space-y-2">
            {recommendations.map((r, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* ── Safety ───────────────────────────────── */}
      {safetyConsiderations && safetyConsiderations.length > 0 && (
        <Block
          icon={Shield}
          iconColor="text-red-500"
          title="Safety Considerations"
          accent="bg-gradient-to-r from-red-400 to-rose-400"
          delay={0.14}
        >
          <ul className="space-y-2">
            {safetyConsiderations.map((s, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 text-sm text-slate-700"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* ── Sources ──────────────────────────────── */}
      {sourceSnippets && sourceSnippets.length > 0 && (
        <Block
          icon={BookOpen}
          iconColor="text-slate-500"
          title="Source Attribution"
          accent="bg-gradient-to-r from-primary-400 to-trust-400"
          delay={0.16}
        >
          <div className="space-y-2">
            {sourceSnippets.map((src, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all duration-200 group"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-trust-500 text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors line-clamp-2 leading-snug flex items-start gap-1"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary-400" />
                  </a>

                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    {src.authors && (
                      <span className="text-xs text-slate-500 truncate max-w-[160px]">
                        {src.authors}
                      </span>
                    )}
                    {src.year && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {src.year}
                      </span>
                    )}
                    {src.platform && (
                      <span
                        className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                          src.platform === "PUBMED"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-emerald-50 text-emerald-600",
                        )}
                      >
                        {src.platform}
                      </span>
                    )}
                  </div>

                  {src.snippet && (
                    <div className="mt-2 flex items-start gap-1.5 bg-white rounded-lg p-2 border-l-2 border-primary-300">
                      <Quote className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">
                        {src.snippet}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ── Footer ───────────────────────────────── */}
      {references && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 pt-2 border-t border-slate-100"
        >
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            {references.publicationCount || 0} publications
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100 font-medium">
            <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
            {references.trialCount || 0} trials
          </span>
          <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
            <Sparkles className="w-3 h-3" />
            LLaMA 3.1
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StructuredResponse;