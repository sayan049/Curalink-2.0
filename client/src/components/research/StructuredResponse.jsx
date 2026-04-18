import { motion } from 'framer-motion';
import {
  FileText, Lightbulb, Shield, CheckCircle,
  ExternalLink, BookOpen, Users, Award, Star,
  FlaskConical, TrendingUp
} from 'lucide-react';

// ✅ Extract researchers from publications
const extractTopResearchers = (publications) => {
  if (!publications || publications.length === 0) return [];

  const authorStats = {};

  publications.forEach((pub, pubIdx) => {
    if (!pub.authors || !Array.isArray(pub.authors)) return;

    pub.authors.forEach((author, authorIdx) => {
      if (!author || author === 'Unknown' || author.trim().length < 3) return;

      const cleanAuthor = author.trim();
      if (!authorStats[cleanAuthor]) {
        authorStats[cleanAuthor] = {
          name: cleanAuthor,
          publications: [],
          totalCitations: 0,
          latestYear: 0,
          institutions: new Set(),
        };
      }

      authorStats[cleanAuthor].publications.push({
        title: pub.title,
        year: pub.year,
        url: pub.url,
        journal: pub.journalName,
        citationCount: pub.citationCount || 0,
      });

      authorStats[cleanAuthor].totalCitations += pub.citationCount || 0;
      if (pub.year > authorStats[cleanAuthor].latestYear) {
        authorStats[cleanAuthor].latestYear = pub.year;
      }

      // First authors get more prominence
      if (authorIdx === 0) {
        authorStats[cleanAuthor].isFirstAuthor = true;
      }
    });
  });

  // Sort by total citations + publication count
  return Object.values(authorStats)
    .sort((a, b) => {
      const scoreA = a.totalCitations * 2 + a.publications.length * 10 + (a.isFirstAuthor ? 5 : 0);
      const scoreB = b.totalCitations * 2 + b.publications.length * 10 + (b.isFirstAuthor ? 5 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 6); // Top 6 researchers
};

const StructuredResponse = ({ data, publications, isResearcherQuery }) => {
  const {
    conditionOverview,
    keyFindings,
    researchInsights,
    clinicalTrialsSummary,
    recommendations,
    safetyConsiderations,
    references,
    sourceSnippets,
  } = data;

  // ✅ Extract researchers if this is a researcher query
  const topResearchers = isResearcherQuery
    ? extractTopResearchers(publications)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Condition Overview */}
      {conditionOverview && (
        <div className="glass rounded-xl p-4 border border-primary-200 bg-primary-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-slate-900 mb-2">Condition Overview</h5>
              <p className="text-sm text-slate-700 leading-relaxed">{conditionOverview}</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ TOP RESEARCHERS SECTION - Shows when researcher query detected */}
      {isResearcherQuery && topResearchers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 border border-purple-200 bg-purple-50/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h5 className="font-semibold text-slate-900">Top Researchers</h5>
              <p className="text-xs text-slate-500">Based on publications and citations in search results</p>
            </div>
          </div>

          <div className="grid gap-3">
            {topResearchers.map((researcher, idx) => (
              <motion.div
                key={researcher.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-100 hover:border-purple-300 transition-colors"
              >
                {/* Rank badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' :
                  idx === 1 ? 'bg-slate-400' :
                  idx === 2 ? 'bg-orange-400' :
                  'bg-purple-400'
                }`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{researcher.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {researcher.publications.length} paper{researcher.publications.length > 1 ? 's' : ''}
                        </span>
                        {researcher.totalCitations > 0 && (
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {researcher.totalCitations.toLocaleString()} citations
                          </span>
                        )}
                        {researcher.latestYear > 0 && (
                          <span>Latest: {researcher.latestYear}</span>
                        )}
                      </div>
                    </div>
                    {researcher.isFirstAuthor && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Lead Author
                      </span>
                    )}
                  </div>

                  {/* Recent papers */}
                  {researcher.publications.slice(0, 2).map((pub, pubIdx) => (
                    <div key={pubIdx} className="mt-2">
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:text-primary-700 hover:underline flex items-start gap-1 group"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                        <span className="line-clamp-1">{pub.title}</span>
                      </a>
                      {pub.journal && (
                        <p className="text-xs text-slate-400 ml-4">{pub.journal} ({pub.year})</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Findings */}
      {keyFindings && keyFindings.length > 0 && (
        <div className="glass rounded-xl p-4 border border-trust-200 bg-trust-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-trust-100 rounded-lg flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-trust-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-slate-900 mb-2">Key Findings</h5>
              <ul className="space-y-2">
                {keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-trust-600 mt-0.5 flex-shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Research Insights */}
      {researchInsights && (
        <div className="glass rounded-xl p-4 border border-slate-200">
          <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            Research Insights
          </h5>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {researchInsights}
          </p>
        </div>
      )}

      {/* Clinical Trials Summary */}
      {clinicalTrialsSummary && (
        <div className="glass rounded-xl p-4 border border-purple-200 bg-purple-50/50">
          <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-600" />
            Clinical Trials
          </h5>
          <p className="text-sm text-slate-700 leading-relaxed">{clinicalTrialsSummary}</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="glass rounded-xl p-4 border border-green-200 bg-green-50/50">
          <h5 className="font-semibold text-slate-900 mb-2">💡 Recommendations</h5>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-green-600 font-bold flex-shrink-0">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Considerations */}
      {safetyConsiderations && safetyConsiderations.length > 0 && (
        <div className="glass rounded-xl p-4 border border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-slate-900 mb-2">⚠️ Safety Considerations</h5>
              <ul className="space-y-2">
                {safetyConsiderations.map((safety, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-600 flex-shrink-0">⚠️</span>
                    <span>{safety}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Source Attribution */}
      {sourceSnippets && sourceSnippets.length > 0 && (
        <div className="glass rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h5 className="font-semibold text-slate-900">Source Attribution</h5>
          </div>
          <div className="space-y-3">
            {sourceSnippets.map((source, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{source.title}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {source.authors} • {source.year} • {source.platform}
                    </p>
                    {source.snippet && (
                      <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">
                        "{source.snippet}..."
                      </p>
                    )}
                  </div>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 flex-shrink-0 p-1 hover:bg-primary-50 rounded"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* References Count */}
      {references && (
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 flex items-center gap-4">
          <span>📚 Based on {references.publicationCount || 0} publications</span>
          <span>🧪 {references.trialCount || 0} clinical trials</span>
        </div>
      )}
    </motion.div>
  );
};

export default StructuredResponse;