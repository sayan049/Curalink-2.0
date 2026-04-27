import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Users,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

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
    RECRUITING: 'success',
    ACTIVE_NOT_RECRUITING: 'warning',
    COMPLETED: 'primary',
    ENROLLING_BY_INVITATION: 'warning',
  };

  // ✅ Clean and truncate eligibility text
  const hasEligibility =
    eligibility &&
    eligibility !== 'Not specified' &&
    eligibility.trim().length > 10;

  // ✅ Format eligibility — split by newlines for readability
  const formatEligibility = (text) => {
    if (!text) return [];
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 12); // max 12 lines to avoid overflow
  };

  const eligibilityLines = hasEligibility ? formatEligibility(eligibility) : [];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="glass rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-200"
    >
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 text-sm leading-snug mb-2">
            {title}
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusColors[status] || 'primary'}>
              {status === 'RECRUITING' && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
              )}
              {status?.replace(/_/g, ' ')}
            </Badge>
            {phase && <Badge variant="primary">{phase}</Badge>}
          </div>
        </div>
      </div>

      {/* Conditions */}
      {conditions && conditions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">Conditions:</p>
          <p className="text-xs text-slate-600">
            {conditions.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* Interventions */}
      {interventions && interventions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">
            Interventions:
          </p>
          <p className="text-xs text-slate-600">
            {interventions.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* Location */}
      {locations && locations.length > 0 && (
        <div className="mb-2 flex items-start gap-1 text-xs text-slate-600">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
          <span>{locations.slice(0, 2).join('; ')}</span>
        </div>
      )}

      {/* Enrollment */}
      {enrollmentCount && (
        <div className="mb-2 flex items-center gap-1 text-xs text-slate-600">
          <Users className="w-3 h-3 text-slate-400" />
          <span>{enrollmentCount} participants</span>
        </div>
      )}

      {/* ✅ Eligibility Criteria */}
      {hasEligibility && (
        <div className="mb-3">
          <button
            onClick={() => setShowEligibility(!showEligibility)}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-700 font-semibold">
                Eligibility Criteria
              </span>
            </div>
            {showEligibility ? (
              <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
            )}
          </button>

          <AnimatePresence>
            {showEligibility && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 p-3 bg-amber-50/50 border border-amber-100 rounded-lg max-h-48 overflow-y-auto">
                  {eligibilityLines.length > 1 ? (
                    <ul className="space-y-1">
                      {eligibilityLines.map((line, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5"
                        >
                          {/* Detect inclusion/exclusion headers */}
                          {line.toLowerCase().includes('inclusion') ||
                          line.toLowerCase().includes('exclusion') ? (
                            <span className="font-semibold text-amber-700 text-xs">
                              {line}
                            </span>
                          ) : (
                            <>
                              <span className="text-amber-400 mt-0.5 flex-shrink-0">
                                •
                              </span>
                              <span>{line}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {eligibility.substring(0, 500)}
                      {eligibility.length > 500 ? '...' : ''}
                    </p>
                  )}

                  {/* Show full link if text is long */}
                  {eligibility.length > 400 && (
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
        <div className="mb-3 p-2 bg-primary-50 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-1">Contact:</p>
          <div className="space-y-1">
            {contact.email && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-primary-600 truncate"
                >
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        <span>View on ClinicalTrials.gov</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
};

export default ClinicalTrialCard;