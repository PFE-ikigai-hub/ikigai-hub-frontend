import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {

  affectationsApi,
  annotationsApi,
  commentsApi,
  deliverablesApi,
  projectsApi,
  versionsApi,
} from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { DeliverableCard } from "@/shared/components/ui/DeliverableCard";
import { PageLoader } from "@/shared/components/feedback/PageLoader";
import type { ApiDeliverable, ApiProject, ApiVersion } from "@/types/index";
import { normalizeVersions } from "@/shared/utils/versions";

type EnrichedFeedbackDeliverable = ApiDeliverable & {
  latestVersion?: ApiVersion;
  latestVersionId?: number;
  versionLabel: string;
  commentsCount: number;
  annotationsCount: number;
  projectStatus?: ApiProject["statut"];
};

export function EmployeeFeedbackPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<EnrichedFeedbackDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [layout, setLayoutState] = useState<"grid" | "list">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ikigai:employeeLayout');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return "grid";
  });
  const [currentPage, setCurrentPage] = useState(1);

  const setLayout = useCallback((newLayout: "grid" | "list") => {
    setLayoutState(newLayout);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ikigai:employeeLayout', newLayout);
    }
  }, []);

  const itemsPerPage = 12;

  const fetchData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const affs = await affectationsApi.byEmployee(Number(user.id));
      const projectIds = [...new Set((affs.content ?? []).map((a) => a.projetId).filter(Boolean))];

      if (projectIds.length === 0) {
        setItems([]);
        return;
      }

      const [projects, deliverables] = await Promise.all([
        projectsApi.batch(projectIds),
        deliverablesApi.batchByProjects(projectIds),
      ]);

      const projectStatusById = new Map<number, ApiProject["statut"]>();
      projects.forEach((p) => projectStatusById.set(p.id, p.statut));

      const versionsByDeliverableId = new Map<number, ApiVersion[]>();
      try {
        const allVersions = await versionsApi.batchByDeliverables(deliverables.map((d) => d.id));
        for (const v of allVersions) {
          const existing = versionsByDeliverableId.get(v.livrableId) ?? [];
          existing.push(v);
          versionsByDeliverableId.set(v.livrableId, existing);
        }
      } catch {
      }

      const withFeedbackResults = await Promise.allSettled(
        deliverables.map(async (item) => {
          const normalized = normalizeVersions(versionsByDeliverableId.get(item.id) ?? []);

          let latest = normalized[0] ?? (item.latestVersionId ? {
            id: item.latestVersionId,
            numero: item.latestVersionNumero || '',
            livrableId: item.id,
            livrableNom: item.nom,
            statut: 'REVIEWED',
            commentaires: [],
          } as unknown as ApiVersion : undefined);

          if (!latest) return null;

          const [comments, annotations] = await Promise.all([
            commentsApi.byVersion(latest.id).catch(() => []),
            annotationsApi.byVersion(latest.id).catch(() => []),
          ]);

          if (comments.length === 0 && annotations.length === 0) return null;

          const cardStatus: "EN_REVUE" | "VALIDE" =
            latest.statut === "VALIDATED" ? "VALIDE" : "EN_REVUE";

          const versionLabel =
            latest.numero?.trim?.() ||
            item.latestVersionNumero?.trim?.() ||
            (normalized.length ? `V${normalized.length}` : "");

          const latestVersionId = latest.id ?? item.latestVersionId ?? undefined;

          return {
            ...item,
            statut: cardStatus,
            versions: normalized,
            latestVersion: latest,
            latestVersionId,
            versionLabel,
            commentsCount: comments.length,
            annotationsCount: annotations.length,
            projectStatus: projectStatusById.get(item.projetId),
          } as EnrichedFeedbackDeliverable;
        })
      );

      const filtered = withFeedbackResults
        .filter((r): r is PromiseFulfilledResult<EnrichedFeedbackDeliverable | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean) as EnrichedFeedbackDeliverable[];

      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

    if (filters.type && filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.status && filters.status !== "all" && item.statut !== filters.status) return false;

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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 text-stone-900 dark:text-white tracking-tight font-normal"
          >
            {t("employee.feedbackTitle")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-stone-500 dark:text-stone-400"
          >
            {loading ? t("common.loading") : `${filteredItems.length} ${t("deliverables.count")}`}
          </motion.p>
        </div>

        <div className="flex items-center bg-white dark:bg-stone-900/50 rounded-xl p-1 shadow-sm border border-stone-200 dark:border-white/10 w-fit backdrop-blur-md self-start md:self-auto">
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

      <div className="mb-8 sm:mb-10 lg:mb-12">
        <SearchBar filterType="deliverables" onSearch={handleSearch} endDateLabelKey="projects.plannedEnd" />
      </div>

      {loading ? (
        <PageLoader variant={layout === "list" ? "table" : "cards"} />
      ) : (
        <AnimatePresence mode="wait">
          {filteredItems.length > 0 ? (
            layout === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {paginatedItems.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                      layout="grid"
                      onClick={(id) => navigate(`/employee/feedback/${id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/50 dark:bg-stone-900/10 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 overflow-hidden backdrop-blur-sm"
              >
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
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
                        onClick={(id) => navigate(`/employee/feedback/${id}`)}
                      />
                    ))}
                  </tbody>
                </table>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white/50 dark:bg-stone-900/20 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800"
            >
              <p className="text-stone-500">{t("employee.noFeedback")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {totalPages > 1 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 sm:mt-12 flex justify-center gap-2 overflow-x-auto pb-1 px-1"
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
