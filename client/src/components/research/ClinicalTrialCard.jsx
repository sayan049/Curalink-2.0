import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Users,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pill,
} from "lucide-react";
import { cn } from "@/utils/cn";

const ClinicalTrialCard = ({ trial }) => {
  const [showEligibility, setShowEligibility] = useState(false);

  const {
    title,
    status,
    phase,
    conditions,
    interventions,
    locations,
    contact,
    url,
    enrollmentCount,
    eligibility,
  } = trial;

  const isRecruiting = status === "RECRUITING";

  const statusStyle = {
    RECRUITING: "bg-green-50 text-green-700 border-green-200",
    ACTIVE_NOT_RECRUITING: "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-amber-50 text-amber-700 border-amber-200",
    ENROLLING_BY_INVITATION: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const accentStyle = {
    RECRUITING: "from-green-400 to-emerald-400",
    ACTIVE_NOT_RECRUITING: "from-blue-400 to-sky-400",
    COMPLETED: "from-amber-400 to-orange-400",
    ENROLLING_BY_INVITATION: "from-purple-400 to-violet-400",
  };

  const hasEligibility =
    eligibility &&
    eligibility !== "Not specified" &&
    eligibility.trim().length > 10;

  const eligibilityLines = hasEligibility
    ? eligibility
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, 12)
    : [];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-200 overflow-hidden"
    >
      {/* Accent bar */}
      <div
        className={cn(
          "h-0.5 w-full bg-gradient-to-r",
          accentStyle[status] || "from-slate-400 to-slate-300",
        )}
      />

      <div className="p-4">
        {/* Status + Phase */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wide",
              statusStyle[status] || "bg-slate-50 text-slate-700 border-slate-200",
            )}
          >
            {isRecruiting && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
            <FlaskConical className="w-3 h-3" />
            {status?.replace(/_/g, " ")}
          </span>

          {phase && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold uppercase tracking-wide">
              {phase}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-900 text-sm leading-snug mb-3 group-hover:text-purple-700 transition-colors line-clamp-3 break-words">
          {title}
        </h4>

        {/* Conditions */}
        {conditions && conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {conditions.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 truncate max-w-[180px]"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Interventions */}
        {interventions && interventions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {interventions.slice(0, 3).map((inv, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 truncate max-w-[180px]"
              >
                <Pill className="w-3 h-3 flex-shrink-0" />
                {inv}
              </span>
            ))}
          </div>
        )}

        {/* Location + Enrollment */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-600">
          {locations && locations.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="truncate max-w-[200px]">
                {locations.slice(0, 2).join("; ")}
              </span>
            </span>
          )}
          {enrollmentCount && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400 flex-shrink-0" />
              {enrollmentCount} participants
            </span>
          )}
        </div>

        {/* Eligibility */}
        {hasEligibility && (
          <div className="mb-3">
            <button
              onClick={() => setShowEligibility(!showEligibility)}
              className={cn(
                "w-full flex items-center justify-between text-xs font-semibold rounded-xl px-3 py-2 border transition-colors",
                showEligibility
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
              )}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Eligibility Criteria
              </span>
              {showEligibility ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <AnimatePresence>
              {showEligibility && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 p-3 bg-amber-50/50 border border-amber-100 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {eligibilityLines.length > 1 ? (
                      <ul className="space-y-1.5">
                        {eligibilityLines.map((line, i) => {
                          const isHeader =
                            line.toLowerCase().includes("inclusion") ||
                            line.toLowerCase().includes("exclusion") ||
                            line.toLowerCase().includes("criteria");

                          return (
                            <li
                              key={i}
                              className={cn(
                                "text-xs leading-relaxed",
                                isHeader
                                  ? "font-bold text-amber-800 mt-2 first:mt-0"
                                  : "text-slate-600 flex items-start gap-1.5",
                              )}
                            >
                              {isHeader ? (
                                line
                              ) : (
                                <>
                                  <span className="text-amber-400 mt-0.5 flex-shrink-0">
                                    •
                                  </span>
                                  <span>{line}</span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {eligibility.substring(0, 500)}
                        {eligibility.length > 500 ? "..." : ""}
                      </p>
                    )}

                    {eligibility.length > 400 && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        View full criteria
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Contact */}
        {contact && (contact.email || contact.phone) && (
          <div className="mb-3 p-2.5 rounded-xl bg-primary-50 border border-primary-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Contact
            </p>
            <div className="space-y-1">
              {contact.email && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Mail className="w-3 h-3 text-primary-500 flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-primary-600 truncate font-medium"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Phone className="w-3 h-3 text-primary-500 flex-shrink-0" />
                  <span className="font-medium">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-semibold transition-colors"
        >
          View Trial
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  );
};

export default ClinicalTrialCard;