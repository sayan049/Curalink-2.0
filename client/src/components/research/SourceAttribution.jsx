import { motion } from "framer-motion";
import { ExternalLink, BookOpen, Quote } from "lucide-react";
import { cn } from "@/utils/cn";

const SourceAttribution = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-2"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-bold text-slate-800">Sources</span>
        <span className="ml-auto text-xs text-slate-400">
          {sources.length} reference{sources.length > 1 ? "s" : ""}
        </span>
      </div>

      {sources.map((source, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all duration-200 group"
        >
          {/* Number */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-trust-500 text-white text-xs font-bold flex items-center justify-center">
            {idx + 1}
          </span>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors line-clamp-2 leading-snug flex items-start gap-1"
            >
              <span>{source.title}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-primary-400 transition-opacity" />
            </a>

            {/* Meta */}
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {source.authors && (
                <span className="text-xs text-slate-500">
                  {typeof source.authors === "string"
                    ? source.authors
                    : Array.isArray(source.authors)
                      ? source.authors.slice(0, 2).join(", ")
                      : ""}
                </span>
              )}
              {source.year && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  {source.year}
                </span>
              )}
              {source.platform && (
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                    source.platform === "PUBMED"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-emerald-50 text-emerald-600",
                  )}
                >
                  {source.platform}
                </span>
              )}
            </div>

            {/* Snippet */}
            {source.snippet && (
              <div className="mt-2 flex items-start gap-1.5 bg-slate-50 rounded-lg p-2 border-l-2 border-primary-300">
                <Quote className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">
                  {source.snippet}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default SourceAttribution;