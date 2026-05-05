import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { deliverablesApi, versionsApi } from "@/core/api/client";
import { useI18n } from "@/core/i18n/I18nProvider";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { DeliverableCard } from "@/shared/components/ui/DeliverableCard";
import { PageLoader } from "@/shared/components/feedback/PageLoader";
import type { ApiDeliverable, ApiVersion } from "@/types/index";
import { normalizeVersions } from "@/shared/utils/versions";


type EnrichedDeliverable = ApiDeliverable & {
  latestVersion?: ApiVersion;
  latestVersionId?: number;
  versionLabel: string;
  commentsCount: number;
};

export function AdminDeliverablesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState<EnrichedDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [layout, setLayoutState] = useState<"grid" | "list">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ikigai:deliverablesLayout');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return "grid";
  });
  const [currentPage, setCurrentPage] = useState(1);

  const setLayout = useCallback((newLayout: "grid" | "list") => {
    setLayoutState(newLayout);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ikigai:deliverablesLayout', newLayout);
    }
  }, []);

  const itemsPerPage = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const deliverablesRes = await deliverablesApi.list({ size: 500 });
      const deliverables = deliverablesRes.content ?? [];
      let versionsByDeliverableId = new Map<number, ApiVersion[]>();
      for (const item of deliverables) {
        if (item.versions && item.versions.length > 0) {
          versionsByDeliverableId.set(item.id, item.versions);
        }
      }
      const missingIds = deliverables
        .filter((item) => !versionsByDeliverableId.has(item.id))
        .map((d) => d.id);

      if (missingIds.length > 0) {
        try {
          const allVersions = await versionsApi.batchByDeliverables(missingIds);
          for (const v of allVersions) {
            const existing = versionsByDeliverableId.get(v.livrableId) ?? [];
            existing.push(v);
            versionsByDeliverableId.set(v.livrableId, existing);
          }
        } catch {
        }
      }

      const enriched = deliverables.map((item) => {
        const itemVersions = versionsByDeliverableId.get(item.id) ?? [];
        const normalized = normalizeVersions(itemVersions);

        let latest = normalized[0] ?? (item.latestVersionId ? {
          id: item.latestVersionId,
          numero: item.latestVersionNumero || '',
          livrableId: item.id,
          livrableNom: item.nom,
          statut: 'REVIEWED',
          commentaires: [],
        } as unknown as ApiVersion : undefined);

        const cardStatus: "EN_REVUE" | "VALIDE" =
          latest?.statut === "VALIDATED" ? "VALIDE" : "EN_REVUE";

        const versionLabel =
          latest?.numero?.trim?.() ||
          item.latestVersionNumero?.trim?.() ||
          (normalized.length ? `V${normalized.length}` : "");

        const latestVersionId = latest?.id ?? item.latestVersionId ?? undefined;

        return {
          ...item,
          statut: cardStatus,
          versions: normalized,
          latestVersion: latest,
          latestVersionId,
          versionLabel,
          commentsCount: latest?.commentaires?.length ?? 0,
        } as EnrichedDeliverable;
      });

      setItems(enriched);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (query: string, newFilters: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const filteredItems = items.filter((item) => {
    if (
      searchQuery &&
      !item.nom.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.projetNom.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filters.type && filters.type !== "all") {
      if (item.type !== filters.type) return false;
    }
    if (filters.status && filters.status !== "all") {
      if (item.statut !== filters.status) return false;
    }
    const itemDate = item.dateCreation ? new Date(item.dateCreation) : null;
    const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const to = filters.dateTo ? new Date(filters.dateTo) : null;
    if (from && itemDate && itemDate < from) return false;
    if (to && itemDate) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const,
        stiffness: 100,
        damping: 20,
        mass: 0.8
      }
    }
  } as const;

  return (
    <div className="p-8 md:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl mb-3 text-stone-900 dark:text-white tracking-tight font-normal"
          >
            {t("deliverables.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-stone-500 dark:text-stone-400"
          >
            {`${filteredItems.length} ${t("deliverables.count")}`}
          </motion.p>
        </div>

        <div className="flex items-center bg-white dark:bg-stone-900/50 rounded-xl p-1 shadow-sm border border-stone-200 dark:border-white/10 w-max backdrop-blur-md">
          <button
            onClick={() => setLayout("grid")}
            className={`p-2 rounded-lg transition-colors ${
              layout === "grid"
                ? "bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
            type="button"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-2 rounded-lg transition-colors ${
              layout === "list"
                ? "bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
            type="button"
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-12">
        <SearchBar filterType="deliverables" onSearch={handleSearch} />
      </div>

      {loading ? (
        <PageLoader variant={layout === "list" ? "table" : "cards"} />
      ) : (
        <AnimatePresence mode="wait">
          {filteredItems.length > 0 ? (
            layout === "grid" ? (
              <motion.div
                key="grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {paginatedItems.map((item) => (
                  <motion.div key={item.id} variants={itemVariants}>
                    <DeliverableCard
                      id={String(item.id)}
                      title={item.nom}
                      version={item.versionLabel}
                      status={item.statut}
                      type={item.type}
                      commentsCount={item.commentsCount}
                      projectName={item.projetNom}
                      latestVersionId={item.latestVersionId}
                      fichierUrl={item.latestVersion?.fichierUrl}
                      dateCreation={item.dateCreation}
                      disablePreview
                      onClick={(id) => navigate(`/admin/deliverables/${id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/50 dark:bg-stone-900/10 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 overflow-hidden backdrop-blur-sm"
              >
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800/50">
                      <th className="py-4 px-5 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t("table.deliverable")}</th>
                      <th className="py-4 px-5 text-xs font-semibold text-stone-400 uppercase tracking-wider hidden sm:table-cell">{t("table.version")}</th>
                      <th className="py-4 px-5 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t("status")}</th>
                      <th className="py-4 px-5 text-xs font-semibold text-stone-400 uppercase tracking-wider hidden lg:table-cell">{t("table.comments")}</th>
                      <th className="py-4 px-5 text-xs font-semibold text-stone-400 uppercase tracking-wider hidden sm:table-cell">{t("table.date")}</th>
                      <th className="w-16 px-5 font-semibold text-stone-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <DeliverableCard
                        key={item.id}
                        id={String(item.id)}
                        title={item.nom}
                        version={item.versionLabel}
                        status={item.statut}
                        type={item.type}
                        commentsCount={item.commentsCount}
                        projectName={item.projetNom}
                        latestVersionId={item.latestVersionId}
                        fichierUrl={item.latestVersion?.fichierUrl}
                        dateCreation={item.dateCreation}
                        layout="list"
                        disablePreview
                        onClick={(id) => navigate(`/admin/deliverables/${id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white/50 dark:bg-stone-900/20 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800"
            >
              <p className="text-stone-500">{t("deliverables.noResults")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {totalPages > 1 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex justify-center gap-2"
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
            type="button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors border ${
                currentPage === i + 1
                  ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-md"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
              type="button"
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
            type="button"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
