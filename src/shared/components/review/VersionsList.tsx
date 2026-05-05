// Ce fichier gere une partie du frontend.
import { History, CheckCircle2, Clock, FileClock } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { ApiVersion } from '@/types/index';
import { getStatusIcon } from '@/shared/utils/status';


interface VersionsListProps {
  versions: ApiVersion[];
  currentVersionId?: number;
  onVersionSelect: (versionId: number) => void;
}

export function VersionsList({ versions, currentVersionId, onVersionSelect }: VersionsListProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0f] border-r border-stone-100 dark:border-stone-800/40">
      <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800/40 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0d0d0f]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white tracking-tight">{t('review.versions')}</h3>
        </div>
        <span className="text-[10px] font-medium text-stone-400 bg-stone-50 dark:bg-stone-800/50 px-2 py-0.5 rounded-full border border-stone-100 dark:border-stone-800/50">
          {versions.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-2">
          {versions.map((version, index) => {
            const isSelected = currentVersionId === version.id;
            const StatusIcon = getStatusIcon(version.statut);
            
            return (
              <motion.button
                key={version.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onVersionSelect(version.id)}
                className={`group relative w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border text-left ${
                  isSelected
                    ? 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/30 hover:border-stone-100 dark:hover:border-stone-800/50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-version-indicator"
                    className="absolute inset-0 border-2 border-black dark:border-white rounded-xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                  isSelected 
                    ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:border-gray-300 dark:group-hover:border-gray-500'
                }`}>
                  <FileClock className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 relative z-10 pt-0.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white'}`}>
                      {version.numero}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 uppercase ${
                      version.statut === 'VALIDATED'
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    }`}>
                      <StatusIcon className="w-3 h-3 inline-block mr-1 align-[-2px]" />
                      {t(`status.${version.statut}`)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition-colors">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(version.uploadedAt || version.dateUpload).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {version.uploadedByName && (
                    <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      Upload: {version.uploadedByName}
                    </div>
                  )}
                </div>

                {isSelected && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 self-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-black dark:text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}