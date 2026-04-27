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
  Sparkles,
  AlertTriangle,
  Quote,
  ChevronRight,
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
      const cleanAuthor = author.trim();
      if (!authorStats[cleanAuthor]) {
        authorStats[cleanAuthor] = {
          name: cleanAuthor,
          publications: [],
          totalCitations: 0,
          latestYear: 0,
          isFirstAuthor: false,
        };
      }
      authorStats[cleanAuthor].publications.push({
        title: pub.title,
        year: pub.year,
        url: pub.url,
        journal: pub.journalName,
        citationCount: pub.citationCount || 0,
      });
      authorStats[cleanAuthor].totalCitations += pub.citationCount || 0;
      if (pub.year > authorStats[cleanAuthor].latestYear)
        authorStats[cleanAuthor].latestYear = pub.year;
      if (authorIdx === 0) authorStats[cleanAuthor].isFirstAuthor = true;
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

// ── Section wrapper ───────────────────────────────────────
const Section = ({
  icon: Icon,
  title,
  subtitle,
  iconBg,
  iconColor,
  borderColor,
  bgColor,
  accentGradient,
  children,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={cn(
      "relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-sm",
      "bg-white/70 border-white/60",
    )}
  >
    {/* Top accent bar */}
    <div className={cn("h-0.5 w-full bg-gradient-to-r", accentGradient)} />

    {/* Background glow */}
    <div
      className={cn(
        "absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-15 pointer-events-none",
        bgColor,
      )}
    />

    <div className="relative p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={cn(
            "p-1.5 rounded-lg border shadow-sm flex-shrink-0",
            iconBg,
          )}
        >
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div>
          <h5 className="font-bold text-slate-900 text-sm">{title}</h5>
          {subtitle && (
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>
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
      {/* ── Condition Overview ─────────────────────── */}
      {conditionOverview && (
        <Section
          icon={FileText}
          title="Condition Overview"
          iconBg="bg-blue-50 border-blue-200"
          iconColor="text-blue-600"
          accentGradient="from-blue-500 via-cyan-500 to-sky-400"
          bgColor="bg-blue-400"
          delay={0}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            {conditionOverview}
          </p>
        </Section>
      )}

      {/* ── Top Researchers ────────────────────────── */}
      {isResearcherQuery && topResearchers.length > 0 && (
        <Section
          icon={Users}
          title="Top Researchers"
          subtitle="Ranked by publications and citations"
          iconBg="bg-purple-50 border-purple-200"
          iconColor="text-purple-600"
          accentGradient="from-purple-500 via-violet-500 to-fuchsia-400"
          bgColor="bg-purple-400"
          delay={0.05}
        >
          <div className="space-y-2">
            {topResearchers.map((researcher, idx) => (
              <motion.div
                key={researcher.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-white to-purple-50/30 border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm",
                    idx === 0
                      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                      : idx === 1
                        ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                        : idx === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                          : "bg-gradient-to-br from-purple-400 to-purple-500 text-white",
                  )}
                >
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">
                      {researcher.name}
                    </p>
                    {researcher.isFirstAuthor && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[11px] rounded-full font-semibold border border-purple-200">
                        Lead Author
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {researcher.publications.length} paper
                      {researcher.publications.length > 1 ? "s" : ""}
                    </span>
                    {researcher.totalCitations > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {researcher.totalCitations.toLocaleString()} cited
                      </span>
                    )}
                    {researcher.latestYear > 0 && (
                      <span>{researcher.latestYear}</span>
                    )}
                  </div>

                  {researcher.publications.slice(0, 2).map((pub, i) => (
                    <div key={i} className="mt-1.5">
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline group"
                      >
                        <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{pub.title}</span>
                      </a>
                      {pub.journal && (
                        <p className="text-[11px] text-slate-400 ml-4">
                          {pub.journal} ({pub.year})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Key Findings ───────────────────────────── */}
      {keyFindings && keyFindings.length > 0 && (
        <Section
          icon={Lightbulb}
          title="Key Findings"
          subtitle={`${keyFindings.length} evidence-backed findings`}
          iconBg="bg-teal-50 border-teal-200"
          iconColor="text-teal-600"
          accentGradient="from-teal-500 via-emerald-500 to-green-400"
          bgColor="bg-teal-400"
          delay={0.08}
        >
          <ul className="space-y-2">
            {keyFindings.map((finding, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-teal-50/60 to-white border border-teal-100/80 text-sm text-slate-700"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {idx + 1}
                </div>
                <span className="leading-relaxed">{finding}</span>
              </motion.li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Research Insights ──────────────────────── */}
      {researchInsights && (
        <Section
          icon={TrendingUp}
          title="Research Insights"
          iconBg="bg-indigo-50 border-indigo-200"
          iconColor="text-indigo-600"
          accentGradient="from-indigo-500 via-blue-500 to-sky-400"
          bgColor="bg-indigo-400"
          delay={0.1}
        >
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {researchInsights}
          </p>
        </Section>
      )}

      {/* ── Clinical Trials ────────────────────────── */}
      {clinicalTrialsSummary && (
        <Section
          icon={FlaskConical}
          title="Clinical Trials"
          iconBg="bg-purple-50 border-purple-200"
          iconColor="text-purple-600"
          accentGradient="from-purple-500 via-violet-500 to-fuchsia-400"
          bgColor="bg-purple-400"
          delay={0.12}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            {clinicalTrialsSummary}
          </p>
        </Section>
      )}

      {/* ── Recommendations ────────────────────────── */}
      {recommendations && recommendations.length > 0 && (
        <Section
          icon={CheckCircle}
          title="Recommendations"
          iconBg="bg-green-50 border-green-200"
          iconColor="text-green-600"
          accentGradient="from-green-500 via-emerald-500 to-teal-400"
          bgColor="bg-green-400"
          delay={0.14}
        >
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Safety Considerations ──────────────────── */}
      {safetyConsiderations && safetyConsiderations.length > 0 && (
        <Section
          icon={Shield}
          title="Safety Considerations"
          iconBg="bg-red-50 border-red-200"
          iconColor="text-red-600"
          accentGradient="from-red-500 via-rose-500 to-pink-400"
          bgColor="bg-red-400"
          delay={0.16}
        >
          <ul className="space-y-2">
            {safetyConsiderations.map((safety, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-sm text-slate-700"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{safety}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Source Snippets ────────────────────────── */}
      {sourceSnippets && sourceSnippets.length > 0 && (
        <Section
          icon={BookOpen}
          title="Source Attribution"
          subtitle={`${sourceSnippets.length} references`}
          iconBg="bg-slate-50 border-slate-200"
          iconColor="text-slate-600"
          accentGradient="from-primary-500 via-trust-500 to-purple-500"
          bgColor="bg-primary-400"
          delay={0.18}
        >
          <div className="space-y-2.5">
            {sourceSnippets.map((source, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 hover:border-primary-300 hover:shadow-sm transition-all duration-200"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-trust-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors leading-snug line-clamp-2 inline-flex items-start gap-1 group/link"
                  >
                    <span>{source.title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-primary-500" />
                  </a>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {source.authors && (
                      <span className="text-xs text-slate-500 truncate max-w-[160px]">
                        {source.authors}
                      </span>
                    )}
                    {source.year && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {source.year}
                        </span>
                      </>
                    )}
                    {source.platform && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span
                          className={cn(
                            "text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide",
                            source.platform === "PUBMED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          )}
                        >
                          {source.platform}
                        </span>
                      </>
                    )}
                  </div>

                  {source.snippet && (
                    <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-primary-50/60 border border-primary-100">
                      <Quote className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── References footer ──────────────────────── */}
      {references && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 pt-3 border-t border-slate-200/60"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            {references.publicationCount || 0} publications
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-700 font-semibold">
            <FlaskConical className="w-3.5 h-3.5" />
            {references.trialCount || 0} trials
          </div>
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