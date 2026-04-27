import { motion } from "framer-motion";
import {
  ExternalLink,
  Users,
  Calendar,
  Award,
  BookOpen,
  Quote,
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
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-200 overflow-hidden"
    >
      {/* Color accent */}
      <div
        className={cn(
          "h-0.5 w-full",
          isPubMed
            ? "bg-gradient-to-r from-blue-400 to-cyan-400"
            : "bg-gradient-to-r from-emerald-400 to-teal-400",
        )}
      />

      <div className="p-4">
        {/* Top row — source + year */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide",
              isPubMed
                ? "bg-blue-50 text-blue-600"
                : "bg-emerald-50 text-emerald-600",
            )}
          >
            <BookOpen className="w-3 h-3" />
            {source}
          </span>

          {year && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
              <Calendar className="w-3 h-3 text-slate-400" />
              {year}
            </span>
          )}

          {citationCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-xs font-bold text-amber-700">
              <Award className="w-3 h-3" />
              {citationCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-900 text-sm leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-3 break-words">
          {title}
        </h4>

        {/* Authors */}
        {authors && authors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2.5 text-xs text-slate-500">
            <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">
              {authors.slice(0, 3).join(", ")}
              {authors.length > 3 && (
                <span className="text-slate-400">
                  {" "}+{authors.length - 3}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Abstract */}
        {abstract && abstract !== "No abstract available" && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-slate-50 border-l-2 border-primary-300">
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {abstract}
            </p>
          </div>
        )}

        {/* Journal */}
        {journalName && journalName !== "Unknown" && journalName !== "Unknown Journal" && (
          <p className="text-xs text-slate-400 italic mb-3 truncate">
            {journalName}
          </p>
        )}

        {/* CTA */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
            isPubMed
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
          )}
        >
          Read Paper
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  );
};

export default PublicationCard;