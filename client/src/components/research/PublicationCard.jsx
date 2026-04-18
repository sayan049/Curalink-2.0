import { motion } from 'framer-motion';
import { ExternalLink, Users, Calendar, Award } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const PublicationCard = ({ publication }) => {
  const { title, abstract, authors, year, source, url, citationCount, journalName } = publication;

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
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {authors && authors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{authors.slice(0, 3).join(', ')}</span>
                {authors.length > 3 && <span>+{authors.length - 3} more</span>}
              </div>
            )}
            {year && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{year}</span>
              </div>
            )}
            {citationCount !== null && citationCount !== undefined && (
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>{citationCount} citations</span>
              </div>
            )}
          </div>
        </div>
        <Badge variant={source === 'pubmed' ? 'primary' : 'success'}>
          {source.toUpperCase()}
        </Badge>
      </div>

      {abstract && (
        <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
          {abstract}
        </p>
      )}

      {journalName && (
        <p className="text-xs text-slate-500 italic mb-3">{journalName}</p>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        <span>Read Full Paper</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
};

export default PublicationCard;