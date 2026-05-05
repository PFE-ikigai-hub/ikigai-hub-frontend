// Ce fichier gere une partie du frontend.
import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '@/core/i18n/I18nProvider';


type FilterType = 'projects' | 'deliverables' | 'versions';

interface SearchBarProps {
  filterType: FilterType;
  onSearch: (query: string, filters: Record<string, string>) => void;
  endDateLabelKey?: string;
  showStatusFilter?: boolean;
}

const dateInputClass =
  'w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:outline-none focus:bg-white dark:focus:bg-stone-900 transition-all [color-scheme:light] dark:[color-scheme:dark]';

const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-xs border transition-colors ${
    active
      ? 'ikg-gradient-btn border-stone-900 dark:border-white'
      : 'bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'
  }`;

export function SearchBar({ filterType, onSearch, endDateLabelKey, showStatusFilter = true }: SearchBarProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const handleSearch = () => {
    onSearch(searchQuery, filters);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(searchQuery, newFilters);
  };

  const handleReset = () => {
    const resetFilters = { status: 'all', type: 'all', dateFrom: '', dateTo: '' };
    setFilters(resetFilters);
    setSearchQuery('');
    onSearch('', resetFilters);
  };

  const activeCount = Object.values(filters).filter((v) => v !== 'all' && v !== '').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-stone-400 group-focus-within:text-stone-700 dark:group-focus-within:text-white transition-colors" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('search.placeholder')}
          className="block w-full pl-12 pr-28 py-4 border border-stone-200 dark:border-stone-700 rounded-2xl bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 focus:border-stone-400 dark:focus:border-stone-600 text-base transition-all"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                onSearch('', filters);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative h-9 px-3.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
              showFilters
                ? 'bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-md'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-700'
            }`}
            type="button"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('filter.apply')}</span>
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-xl shadow-stone-100/60 dark:shadow-black/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                {filterType === 'deliverables' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">
                      {t('filter.type')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: t('filter.all') },
                        { value: 'IMAGE', label: t('filter.type.IMAGE') },
                        { value: 'VIDEO', label: t('filter.type.VIDEO') },
                        { value: 'PDF', label: t('filter.type.PDF') },
                        { value: 'TEXTE', label: t('filter.type.TEXTE') },
                        { value: 'AUDIO', label: t('filter.type.AUDIO') },
                        { value: 'AUTRE', label: t('filter.type.AUTRE') },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleFilterChange('type', option.value)}
                          className={chipClass((filters.type || 'all') === option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(filterType === 'projects' || filterType === 'deliverables') && showStatusFilter && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">
                      {t('filter.status')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {filterType === 'projects'
                        ? [
                            { value: 'all', label: t('filter.all') },
                            { value: 'EN_COURS', label: t('status.EN_COURS') },
                            { value: 'TERMINE', label: t('status.TERMINE') },
                            { value: 'ARCHIVE', label: t('status.ARCHIVE') },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('status', option.value)}
                              className={chipClass((filters.status || 'all') === option.value)}
                            >
                              {option.label}
                            </button>
                          ))
                        : [
                            { value: 'all', label: t('filter.all') },
                            { value: 'EN_REVUE', label: t('deliverables.inReview') },
                            { value: 'VALIDE', label: t('deliverables.validated') },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('status', option.value)}
                              className={chipClass((filters.status || 'all') === option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                    </div>
                  </div>
                )}

                {(filterType === 'projects' || filterType === 'deliverables') && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">
                        {t('start_date')}
                      </label>
                      <input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        className={dateInputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">
                        {t(endDateLabelKey ?? (filterType === 'projects' ? 'projects.plannedEnd' : 'end_date'))}
                      </label>
                      <input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        className={dateInputClass}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                  {t('filter.reset')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}