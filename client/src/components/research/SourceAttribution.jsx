import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const SourceAttribution = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-xl p-4 border border-slate-200 mt-4"
    >
      <h5 className="font-semibold text-slate-900 mb-3 text-sm">Sources</h5>
      <div className="space-y-2">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <span className="text-slate-500 font-mono">[{idx + 1}]</span>
            <div className="flex-1">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
              >
                {source.title}
                <ExternalLink className="w-3 h-3" />
              </a>
              {source.authors && (
                <p className="text-slate-600 mt-0.5">
                  {source.authors.join(', ')} ({source.year})
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SourceAttribution;