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
} from "lucide-react";
import Badge from "@/components/ui/Badge";
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

  const statusColors = {
    RECRUITING: "success",
    ACTIVE_NOT_RECRUITING: "warning",
    COMPLETED: "primary",
    ENROLLING_BY_INVITATION: "warning",
  };

  const hasEligibility =
    eligibility &&
    eligibility !== "Not specified" &&
    eligibility.trim().length > 10;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Title */}
      <div className="mb-3">
        <h4 className="font-semibold text-slate-900 text-sm leading-snug">
          {title}
        </h4>
      </div>

      {/* Status + Phase */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={statusColors[status] || "primary"}>
          {status === "RECRUITING" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
          )}
          {status?.replace(/_/g, " ")}
        </Badge>

        {phase && <Badge variant="primary">{phase}</Badge>}
      </div>

      {/* Conditions */}
      {conditions && conditions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">
            Conditions
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {conditions.slice(0, 3).join(", ")}
          </p>
        </div>
      )}

      {/* Interventions */}
      {interventions && interventions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">
            Interventions
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {interventions.slice(0, 3).join(", ")}
          </p>
        </div>
      )}

      {/* Location */}
      {locations && locations.length > 0 && (
        <div className="mb-2 flex items-start gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
          <span>{locations.slice(0, 2).join("; ")}</span>
        </div>
      )}

      {/* Enrollment */}
      {enrollmentCount && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-600">
          <Users className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span>{enrollmentCount} participants</span>
        </div>
      )}

      {/* Eligibility */}
      {hasEligibility && (
        <div className="mb-3">
          <button
            onClick={() => setShowEligibility(!showEligibility)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Eligibility Criteria</span>
            </div>

            {showEligibility ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {eligibility.substring(0, 600)}
                    {eligibility.length > 600 ? "..." : ""}
                  </p>

                  {eligibility.length > 600 && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
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
        <div className="mb-3 rounded-xl bg-primary-50 border border-primary-100 p-3">
          <p className="text-xs font-medium text-slate-700 mb-2">Contact</p>

          <div className="space-y-1.5">
            {contact.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-primary-600 truncate"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Phone className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                <span>{contact.phone}</span>
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium transition-colors"
      >
        View Trial
        <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
};

export default ClinicalTrialCard;