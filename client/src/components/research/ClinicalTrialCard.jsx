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
  Sparkles,
  Stethoscope,
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
  const isCompleted = status === "COMPLETED";

  const statusConfig = {
    RECRUITING: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      dot: "bg-green-500",
      glow: "bg-green-400",
      accent: "from-green-500 via-emerald-500 to-teal-400",
    },
    ACTIVE_NOT_RECRUITING: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      glow: "bg-blue-400",
      accent: "from-blue-500 via-sky-500 to-cyan-400",
    },
    COMPLETED: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
      glow: "bg-amber-400",
      accent: "from-amber-500 via-orange-500 to-yellow-400",
    },
    ENROLLING_BY_INVITATION: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
      glow: "bg-purple-400",
      accent: "from-purple-500 via-violet-500 to-fuchsia-400",
    },
  };

  const currentStatus = statusConfig[status] || {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
    glow: "bg-slate-400",
    accent: "from-slate-500 to-slate-400",
  };

  const hasEligibility =
    eligibility &&
    eligibility !== "Not specified" &&
    eligibility.trim().length > 10;

  const formatEligibility = (text) => {
    if (!text) return [];
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 12);
  };

  const eligibilityLines = hasEligibility
    ? formatEligibility(eligibility)
    : [];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300"
    >
      {/* ── Top accent bar ──────────────────────────── */}
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r",
          currentStatus.accent,
        )}
      />

      {/* ── Background glow ─────────────────────────── */}
      <div
        className={cn(
          "absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl opacity-15 pointer-events-none",
          currentStatus.glow,
        )}
      />

      <div className="relative p-4 sm:p-5">
        {/* ── Status + Phase row ───────────────────── */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div
            className={cn(
              "p-1.5 rounded-lg border shadow-sm",
              currentStatus.bg,
              currentStatus.border,
            )}
          >
            <FlaskConical
              className={cn("w-4 h-4", currentStatus.text)}
            />
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider",
              currentStatus.bg,
              currentStatus.text,
              currentStatus.border,
            )}
          >
            {isRecruiting && (
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  currentStatus.dot,
                )}
              />
            )}
            {status?.replace(/_/g, " ")}
          </span>

          {phase && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" />
              {phase}
            </span>
          )}
        </div>

        {/* ── Title ────────────────────────────────── */}
        <h4 className="font-bold text-slate-900 text-sm sm:text-[15px] leading-snug mb-3 group-hover:text-purple-700 transition-colors break-words">
          {title}
        </h4>

        {/* ── Conditions ───────────────────────────── */}
        {conditions && conditions.length > 0 && (
          <div className="mb-2.5">
            <div className="flex flex-wrap gap-1.5">
              {conditions.slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-sm"
                >
                  <Stethoscope className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{c}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Interventions ─────────────────────────── */}
        {interventions && interventions.length > 0 && (
          <div className="mb-2.5">
            <div className="flex flex-wrap gap-1.5">
              {interventions.slice(0, 3).map((inv, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 shadow-sm"
                >
                  <Pill className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{inv}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Location + Enrollment row ──────────── */}
        <div className="flex flex-wrap gap-2 mb-3">
          {locations && locations.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-sm max-w-full">
              <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="truncate">
                {locations.slice(0, 2).join("; ")}
              </span>
            </div>
          )}

          {enrollmentCount && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
              <Users className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="font-semibold">{enrollmentCount}</span>
              <span className="text-slate-400">participants</span>
            </div>
          )}
        </div>

        {/* ── Eligibility Criteria ───────────────── */}
        {hasEligibility && (
          <div className="mb-3">
            <button
              onClick={() => setShowEligibility(!showEligibility)}
              className={cn(
                "w-full flex items-center justify-between text-xs font-semibold rounded-xl px-3 py-2.5 transition-all duration-200 border shadow-sm",
                showEligibility
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
              )}
            >
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Eligibility Criteria</span>
              </div>
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
                  <div className="mt-1.5 p-3 bg-gradient-to-br from-amber-50/80 to-white border border-amber-100 rounded-xl max-h-52 overflow-y-auto custom-scrollbar">
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
                                  ? "font-bold text-amber-800 mt-2 first:mt-0 border-b border-amber-200 pb-1"
                                  : "text-slate-600 flex items-start gap-1.5",
                              )}
                            >
                              {isHeader ? (
                                <span>{line}</span>
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
                        className="mt-2.5 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
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

        {/* ── Contact ──────────────────────────────── */}
        {contact && (contact.email || contact.phone) && (
          <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-primary-50/80 to-white border border-primary-200/50 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Contact
            </p>
            <div className="space-y-1.5">
              {contact.email && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="p-1 rounded-md bg-white border border-slate-200 shadow-sm">
                    <Mail className="w-3 h-3 text-primary-500" />
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-primary-600 transition-colors truncate font-medium"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="p-1 rounded-md bg-white border border-slate-200 shadow-sm">
                    <Phone className="w-3 h-3 text-primary-500" />
                  </div>
                  <span className="font-medium">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer CTA ───────────────────────────── */}
        <div className="flex items-center justify-end pt-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <span>View Trial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default ClinicalTrialCard;