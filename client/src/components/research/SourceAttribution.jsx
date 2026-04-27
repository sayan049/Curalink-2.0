import { motion } from "framer-motion";
import { ExternalLink, BookOpen, Sparkles, Quote } from "lucide-react";
import { cn } from "@/utils/cn";

const SourceAttribution = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-sm mt-4"
    >
      {/* Top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-trust-500 to-purple-500" />

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 bg-primary-400 pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg bg-primary-50 border border-primary-200 shadow-sm">
            <BookOpen className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 text-sm">
              Source Attribution
            </h5>
            <p className="text-[11px] text-slate-500">
              {sources.length} reference{sources.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Sources */}
        <div className="space-y-2.5">
          {sources.map((source, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 hover:border-primary-300 hover:shadow-sm transition-all duration-200"
            >
              {/* Index */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-trust-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                {idx + 1}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors leading-snug line-clamp-2 inline-flex items-start gap-1 group/link"
                >
                  <span>{source.title}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-primary-500" />
                </a>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {source.authors && (
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">
                      {typeof source.authors === "string"
                        ? source.authors
                        : Array.isArray(source.authors)
                          ? source.authors.slice(0, 2).join(", ")
                          : ""}
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

                {/* Snippet */}
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
      </div>
    </motion.div>
  );
};

export default SourceAttribution;