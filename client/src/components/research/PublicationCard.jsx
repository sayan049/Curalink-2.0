import { motion } from "framer-motion";
import {
  ExternalLink,
  Users,
  Calendar,
  Award,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";

const PublicationCard = ({ publication }) => {
  const {
    title,
    abstract,
    authors,
    year,
    source,
    url,
    citationCount,
    journalName,
  } = publication;

  const isPubMed = source === "pubmed";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300"
    >
      {/* ── Top accent bar ──────────────────────────── */}
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r",
          isPubMed
            ? "from-blue-500 via-cyan-500 to-sky-400"
            : "from-emerald-500 via-teal-500 to-green-400",
        )}
      />

      {/* ── Background glow ─────────────────────────── */}
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none",
          isPubMed ? "bg-blue-400" : "bg-emerald-400",
        )}
      />

      <div className="relative p-4 sm:p-5">
        {/* ── Source badge + icon ───────────────────── */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "p-1.5 rounded-lg border shadow-sm",
              isPubMed
                ? "bg-blue-50 border-blue-200"
                : "bg-emerald-50 border-emerald-200",
            )}
          >
            <BookOpen
              className={cn(
                "w-4 h-4",
                isPubMed ? "text-blue-600" : "text-emerald-600",
              )}
            />
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider",
              isPubMed
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200",
            )}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {source}
          </span>

          {year && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
              <Calendar className="w-3 h-3" />
              {year}
            </span>
          )}
        </div>

        {/* ── Title ────────────────────────────────── */}
        <h4 className="font-bold text-slate-900 text-sm sm:text-[15px] leading-snug mb-3 group-hover:text-primary-700 transition-colors break-words">
          {title}
        </h4>

        {/* ── Meta row ─────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {authors && authors.length > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-sm max-w-full">
              <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {authors.slice(0, 2).join(", ")}
                {authors.length > 2 && (
                  <span className="text-slate-400 ml-0.5">
                    +{authors.length - 2}
                  </span>
                )}
              </span>
            </div>
          )}

          {citationCount !== null &&
            citationCount !== undefined &&
            citationCount > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 shadow-sm">
                <Award className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold">
                  {citationCount.toLocaleString()}
                </span>
              </div>
            )}
        </div>

        {/* ── Abstract ─────────────────────────────── */}
        {abstract && abstract !== "No abstract available" && (
          <div className="mb-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/70 p-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Abstract
            </p>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed line-clamp-4">
              {abstract}
            </p>
          </div>
        )}

        {/* ── Journal ──────────────────────────────── */}
        {journalName && journalName !== "Unknown" && (
          <div className="mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-500 italic shadow-sm">
              <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-[300px]">
                {journalName}
              </span>
            </div>
          </div>
        )}

        {/* ── Footer CTA ───────────────────────────── */}
        <div className="flex items-center justify-end pt-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md",
              isPubMed
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600",
            )}
          >
            <span>Read Paper</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default PublicationCard;