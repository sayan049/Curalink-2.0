import { motion } from "framer-motion";
import { ExternalLink, Users, Calendar, Award, BookOpen } from "lucide-react";
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
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Source + Year + Citations */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase",
            isPubMed
              ? "bg-blue-50 text-blue-600"
              : "bg-emerald-50 text-emerald-600",
          )}
        >
          <BookOpen className="w-3 h-3" />
          {source}
        </span>

        {year && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
            <Calendar className="w-3 h-3 text-slate-400" />
            {year}
          </span>
        )}

        {citationCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-xs font-semibold text-amber-700">
            <Award className="w-3 h-3" />
            {citationCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-slate-900 text-sm leading-snug mb-2 line-clamp-3">
        {title}
      </h4>

      {/* Authors */}
      {authors && authors.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">
            {authors.slice(0, 3).join(", ")}
            {authors.length > 3 && ` +${authors.length - 3}`}
          </span>
        </div>
      )}

      {/* Abstract */}
      {abstract &&
        abstract !== "No abstract available" &&
        abstract.length > 20 && (
          <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-3">
            {abstract}
          </p>
        )}

      {/* Journal */}
      {journalName &&
        journalName !== "Unknown" &&
        journalName !== "Unknown Journal" && (
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
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
          isPubMed
            ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        )}
      >
        Read Paper
        <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
};

export default PublicationCard;