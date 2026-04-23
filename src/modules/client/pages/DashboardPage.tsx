import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { deliverablesApi, projectsApi, versionsApi } from "@/core/api/client";
import { useI18n } from "@/core/i18n/I18nProvider";
import { motion, AnimatePresence } from "motion/react";
import { SquaresFour, List as ListIcon, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { DeliverableCard } from "@/shared/components/ui/DeliverableCard";
import { PageLoader } from "@/shared/components/feedback/PageLoader";
import { CardSkeleton, Loadable } from "@/shared/components/skeleton";
import type { ApiDeliverable, ApiProject, ApiVersion, ProjectStatus } from "@/types/index";
import { normalizeVersions } from "@/shared/utils/versions";

type ViewType = "mes-projets" | "en-revue" | "valides" | "archives";

type EnrichedDeliverable = ApiDeliverable & {
  latestVersion?: ApiVersion;
  latestVersionId?: number;
  versionLabel: string;
  commentsCount: number;
  projectStatus?: ProjectStatus;
};

interface DeliverablesViewProps {
  viewType: ViewType;
  titleKey: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DeliverablesGridProps {
  items: EnrichedDeliverable[];
  onOpen: (id: string) => void;
  itemVariants: any;
  containerVariants: {
    hidden: { opacity: number };
    visible: { opacity: number; transition: { staggerChildren: number } };
  };
}

interface DeliverablesListProps {
  items: EnrichedDeliverable[];
  onOpen: (id: string) => void;
  t: (key: string) => string;
}

const LAYOUT_STORAGE_KEY = "ikigai:clientLayout";
const ITEMS_PER_PAGE = 12;

function getLatestVersion(versions: ApiVersion[]): ApiVersion | undefined {
  if (!versions.length) return undefined;
  return [...versions].sort((a, b) => new Date(b.dateUpload).getTime() - new Date(a.dateUpload).getTime())[0];
}

// Lit le layout sauvegarde pour garder la preference utilisateur.
function getInitialLayout(): "grid" | "list" {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === "list" || saved === "grid") return saved;
  }
  return "grid";
}

// Sauvegarde le layout choisi entre les sessions.
function saveLayout(layout: "grid" | "list") {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  }
}

// Construit les parametres API selon la vue active.
function buildDeliverableParams(viewType: ViewType): Record<string, string | number> {
  const params: Record<string, string | number> = { size: 100 };
  if (viewType === "en-revue") params.statut = "EN_REVUE";
  if (viewType === "valides") params.statut = "VALIDE";
  return params;
}

// Regroupe les versions par identifiant de livrable.
function groupVersionsByDeliverable(versions: ApiVersion[]): Map<number, ApiVersion[]> {
  const versionsByDeliverableId = new Map<number, ApiVersion[]>();
  for (const version of versions) {
    const existing = versionsByDeliverableId.get(version.livrableId) ?? [];
    existing.push(version);
    versionsByDeliverableId.set(version.livrableId, existing);
  }
  return versionsByDeliverableId;
}

async function fetchVersionsMap(deliverableIds: number[]): Promise<Map<number, ApiVersion[]>> {
  try {
    const allVersions = await versionsApi.batchByDeliverables(deliverableIds);
    return groupVersionsByDeliverable(allVersions);
  } catch {
    return new Map<number, ApiVersion[]>();
  }
}

function buildProjectStatusMap(projects: ApiProject[]): Map<number, ProjectStatus> {
  const projectStatusById = new Map<number, ProjectStatus>();
  projects.forEach((project) => {
    projectStatusById.set(project.id, project.statut);
  });
  return projectStatusById;
}

function buildFallbackVersion(item: ApiDeliverable): ApiVersion | undefined {
  if (!item.latestVersionId) return undefined;

  return {
    id: item.latestVersionId,
    numero: item.latestVersionNumero || "",
    livrableId: item.id,
    livrableNom: item.nom,
    statut: "REVIEWED",
    commentaires: [],
  } as unknown as ApiVersion;
}

function getCardStatus(latestVersion?: ApiVersion): "EN_REVUE" | "VALIDE" {
  return latestVersion?.statut === "VALIDATED" ? "VALIDE" : "EN_REVUE";
}

function getVersionLabel(item: ApiDeliverable, normalizedVersions: ApiVersion[], latestVersion?: ApiVersion): string {
  return latestVersion?.numero?.trim?.() || item.latestVersionNumero?.trim?.() || (normalizedVersions.length ? `V${normalizedVersions.length}` : "");
}

// Enrichit la reponse API pour simplifier le rendu de la carte.
function enrichDeliverable(
  item: ApiDeliverable,
  versionsByDeliverableId: Map<number, ApiVersion[]>,
  projectStatusById: Map<number, ProjectStatus>
): EnrichedDeliverable {
  const normalizedVersions = normalizeVersions(versionsByDeliverableId.get(item.id) ?? []);
  const latestVersion = getLatestVersion(normalizedVersions) ?? normalizedVersions[0] ?? buildFallbackVersion(item);

  return {
    ...item,
    statut: getCardStatus(latestVersion),
    versions: normalizedVersions,
    latestVersion,
    latestVersionId: latestVersion?.id ?? item.latestVersionId ?? undefined,
    versionLabel: getVersionLabel(item, normalizedVersions, latestVersion),
    commentsCount: latestVersion?.commentaires?.length ?? 0,
    projectStatus: projectStatusById.get(item.projetId),
  } as EnrichedDeliverable;
}

function matchesViewType(item: EnrichedDeliverable, viewType: ViewType): boolean {
  if (viewType === "mes-projets") return item.projectStatus !== "ARCHIVE";
  if (viewType === "archives") return item.projectStatus === "ARCHIVE";
  return true;
}

function matchesSearch(item: EnrichedDeliverable, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  return item.nom.toLowerCase().includes(normalizedQuery) || item.projetNom.toLowerCase().includes(normalizedQuery);
}

function matchesTypeFilter(item: EnrichedDeliverable, filters: Record<string, string>): boolean {
  if (!filters.type || filters.type === "all") return true;
  return item.type === filters.type;
}

function matchesStatusFilter(item: EnrichedDeliverable, filters: Record<string, string>): boolean {
  if (!filters.status || filters.status === "all") return true;
  return item.statut === filters.status;
}

function matchesDateFilter(item: EnrichedDeliverable, filters: Record<string, string>): boolean {
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
}

// Applique exactement les memes regles de filtrage qu'avant.
function filterDeliverables(items: EnrichedDeliverable[], viewType: ViewType, query: string, filters: Record<string, string>) {
  return items.filter((item) => {
    if (!matchesViewType(item, viewType)) return false;
    if (!matchesSearch(item, query)) return false;
    if (!matchesTypeFilter(item, filters)) return false;
    if (!matchesStatusFilter(item, filters)) return false;
    if (!matchesDateFilter(item, filters)) return false;
    return true;
  });
}

function DeliverablesGrid({ items, onOpen, itemVariants, containerVariants }: DeliverablesGridProps) {
  return (
    <motion.div
      key="grid"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {items.map((item) => (
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
            layout="grid"
            onClick={onOpen}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function DeliverablesList({ items, onOpen, t }: DeliverablesListProps) {
  return (
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
            {items.map((item) => (
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
                onClick={onOpen}
              />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function EmptyResults({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-24 bg-white/50 dark:bg-stone-900/20 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800"
    >
      <p className="text-stone-500">{t("deliverables.noResults")}</p>
    </motion.div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-10 sm:mt-12 flex justify-center gap-2 overflow-x-auto pb-1 px-1"
    >
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
      >
        <CaretLeft className="w-5 h-5" />
      </button>

      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i + 1)}
          className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors border ${
            currentPage === i + 1
              ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-md"
              : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
      >
        <CaretRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function useDeliverablesData(viewType: ViewType) {
  const [items, setItems] = useState<EnrichedDeliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Charge les donnees principales de la page.
      const [deliverablesRes, projectsRes] = await Promise.all([
        deliverablesApi.list(buildDeliverableParams(viewType)),
        projectsApi.list({ size: 500 }),
      ]);

      const deliverables = deliverablesRes.content ?? [];
      const versionsByDeliverableId = await fetchVersionsMap(deliverables.map((deliverable) => deliverable.id));
      const projectStatusById = buildProjectStatusMap(projectsRes.content ?? []);

      const enriched = deliverables.map((item) => enrichDeliverable(item, versionsByDeliverableId, projectStatusById));
      setItems(enriched);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [viewType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading };
}

function DeliverablesView({ viewType, titleKey }: DeliverablesViewProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { items, loading } = useDeliverablesData(viewType);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [layout, setLayoutState] = useState<"grid" | "list">(getInitialLayout);
  const [currentPage, setCurrentPage] = useState(1);

  const setLayout = useCallback((newLayout: "grid" | "list") => {
    setLayoutState(newLayout);
    saveLayout(newLayout);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewType]);

  const handleSearch = useCallback((query: string, newFilters: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const filteredItems = useMemo(() => {
    // Filtre la liste selon la recherche et les filtres actifs.
    return filterDeliverables(items, viewType, searchQuery, filters);
  }, [items, viewType, searchQuery, filters]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = currentPage * ITEMS_PER_PAGE;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } },
  };

  const handleOpenReview = useCallback(
    (id: string) => {
      navigate(`/client/review/${id}`);
    },
    [navigate]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 text-stone-900 dark:text-white tracking-tight font-normal"
          >
            {t(titleKey)}
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
          >
            <SquaresFour className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-2 rounded-lg transition-colors ${
              layout === "list"
                ? "bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-8 sm:mb-10 lg:mb-12">
        <SearchBar filterType="deliverables" onSearch={handleSearch} showStatusFilter={false} />
      </div>

      <Loadable
        isLoading={loading}
        skeleton={layout === "list" ? <PageLoader variant="table" /> : <CardSkeleton count={4} layout="grid" />}
      >
        <AnimatePresence mode="wait">
          {filteredItems.length > 0 ? (
            layout === "grid" ? (
              <DeliverablesGrid
                items={paginatedItems}
                onOpen={handleOpenReview}
                itemVariants={itemVariants}
                containerVariants={containerVariants}
              />
            ) : (
              <DeliverablesList items={paginatedItems} onOpen={handleOpenReview} t={t} />
            )
          ) : (
            <EmptyResults t={t} />
          )}
        </AnimatePresence>
      </Loadable>

      {totalPages > 1 && !loading && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
}

export function ClientDashboardPage() {
  return <DeliverablesView viewType="mes-projets" titleKey="nav.myProjects" />;
}

export function ClientReviewPage() {
  return <DeliverablesView viewType="en-revue" titleKey="nav.inReview" />;
}

export function ClientValidatedPage() {
  return <DeliverablesView viewType="valides" titleKey="nav.validated" />;
}

export function ClientArchivedPage() {
  return <DeliverablesView viewType="archives" titleKey="nav.archived" />;
}
