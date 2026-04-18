import { motion } from 'framer-motion';
import { ExternalLink, MapPin, Phone, Mail, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';

const ClinicalTrialCard = ({ trial }) => {
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
  } = trial;

  const statusColors = {
    RECRUITING: 'success',
    'ACTIVE_NOT_RECRUITING': 'warning',
    COMPLETED: 'primary',
    ENROLLING_BY_INVITATION: 'warning',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="glass rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 text-sm leading-snug mb-2">
            {title}
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusColors[status] || 'primary'}>{status}</Badge>
            {phase && <Badge variant="primary">{phase}</Badge>}
          </div>
        </div>
      </div>

      {conditions && conditions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">Conditions:</p>
          <p className="text-xs text-slate-600">{conditions.slice(0, 3).join(', ')}</p>
        </div>
      )}

      {interventions && interventions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-slate-700 mb-1">Interventions:</p>
          <p className="text-xs text-slate-600">{interventions.slice(0, 3).join(', ')}</p>
        </div>
      )}

      {locations && locations.length > 0 && (
        <div className="mb-2 flex items-start gap-1 text-xs text-slate-600">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{locations.slice(0, 2).join('; ')}</span>
        </div>
      )}

      {enrollmentCount && (
        <div className="mb-2 flex items-center gap-1 text-xs text-slate-600">
          <Users className="w-3 h-3" />
          <span>{enrollmentCount} participants</span>
        </div>
      )}

      {contact && (contact.email || contact.phone) && (
        <div className="mb-3 p-2 bg-primary-50 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-1">Contact:</p>
          <div className="space-y-1">
            {contact.email && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${contact.email}`} className="hover:text-primary-600">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Phone className="w-3 h-3" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

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