import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { affectationsApi, deliverablesApi, projectsApi, versionsApi } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/shared/components/ui/card";
import { SearchBar } from "@/shared/components/ui/SearchBar";
import { Loadable, TableSkeleton } from "@/shared/components/skeleton";
import { FolderSimpleIcon as FolderSimple, UploadSimpleIcon as UploadSimple, UsersThreeIcon as UsersThree } from "@phosphor-icons/react";
import type { ApiAffectation, ApiDeliverable, ApiProject, DeliverableType, ProjectStatus } from "@/types/index";
import { getStatusIcon } from "@/shared/utils/status";
export function EmployeeDashboardPage() {
  return <EmployeeAssignedProjects />;
}

export function EmployeeProjectsPage() {
  return <EmployeeAssignedProjects />;
}

type ProjectWithRole = {
  project: ApiProject;
  role: string;
  affectationId: number;
};

const ACCEPTED_MIME_PREFIXES = ["image/", "video/", "audio/", "text/"];
const ACCEPTED_EXACT_MIME_TYPES = ["application/pdf"];
const ACCEPTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".md",
  ".mp4",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
];

function statusPill(status: ProjectStatus): string {
  switch (status) {
    case "EN_COURS":
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
    case "TERMINE":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
    case "ARCHIVE":
      return "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
    case "EN_ATTENTE":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
    default:
      return "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50";
  }
}

function mapAffectationsToProjects(affectations: ApiAffectation[], projects: ApiProject[]): ProjectWithRole[] {
  const projectById = new Map<number, ApiProject>(projects.map((project) => [project.id, project]));
  return affectations
    .map((affectation) => {
      const project = projectById.get(affectation.projetId);
      if (!project) return null;
      return {
        project,
        role: affectation.roleDansProjet || "EMPLOYE",
        affectationId: affectation.id,
      } satisfies ProjectWithRole;
    })
    .filter(Boolean) as ProjectWithRole[];
}

function buildDateRange(filters: Record<string, string>) {
  return {
    from: filters.dateFrom ? new Date(filters.dateFrom) : null,
    to: filters.dateTo ? new Date(filters.dateTo) : null,
  };
}

function matchProjectDate(project: ApiProject, from: Date | null, to: Date | null) {
  const itemDate = project.dateDebut ? new Date(project.dateDebut) : null;
  if (from && itemDate && itemDate < from) return false;
  if (to && itemDate) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (itemDate > end) return false;
  }
  return true;
}

function matchProjectSearch(item: ProjectWithRole, searchQuery: string) {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  return (
    item.project.nom.toLowerCase().includes(query) ||
    item.project.clientNom.toLowerCase().includes(query) ||
    item.role.toLowerCase().includes(query)
  );
}
function filterAssignedProjects(items: ProjectWithRole[], searchQuery: string, filters: Record<string, string>) {
  const statusFilter = filters.status && filters.status !== "all" ? filters.status : "";
  const { from, to } = buildDateRange(filters);

  return items.filter((item) => {
    if (statusFilter && item.project.statut !== statusFilter) return false;
    if (!matchProjectDate(item.project, from, to)) return false;
    if (!matchProjectSearch(item, searchQuery)) return false;
    return true;
  });
}

function isAcceptedFile(candidate: File) {
  const lowerName = candidate.name.toLowerCase();
  const isAcceptedByExtension = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const isAcceptedByMime =
    ACCEPTED_EXACT_MIME_TYPES.includes(candidate.type) ||
    ACCEPTED_MIME_PREFIXES.some((prefix) => candidate.type.startsWith(prefix));
  return isAcceptedByMime || isAcceptedByExtension;
}

function EmployeeAssignedProjects() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const affectationsPage = await affectationsApi.byEmployee(Number(user.id));
        const affectations = (affectationsPage.content ?? []) as ApiAffectation[];
        const projectIds = [...new Set(affectations.map((a) => a.projetId).filter(Boolean))];

        if (projectIds.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        const projects = await projectsApi.batch(projectIds);
        const mapped = mapAffectationsToProjects(affectations, projects);

        if (!cancelled) setItems(mapped);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSearch = (query: string, newFilters: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(newFilters);
  };

  const filtered = useMemo(() => {
    return filterAssignedProjects(items, searchQuery, filters);
  }, [filters.dateFrom, filters.dateTo, filters.status, items, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 text-stone-900 dark:text-white tracking-tight font-normal"
          >
            {t("employee.assignedProjects")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-stone-500 dark:text-stone-400"
          >
            {loading ? t("common.loading") : `${filtered.length} ${t("projects.count")}`}
          </motion.p>
        </div>
      </div>

      <div className="mb-8 sm:mb-10 lg:mb-12">
        <SearchBar filterType="projects" onSearch={handleSearch} />
      </div>

      <Loadable isLoading={loading} skeleton={<TableSkeleton rows={4} />}>
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 overflow-hidden"
            >
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800/60">
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("project_name")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("client")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("status")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("role")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("start_date")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("projects.plannedEnd")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, index) => {
                      const StatusIcon = getStatusIcon(item.project.statut);
                      return (
                        <motion.tr
                          key={`${item.project.id}-${item.affectationId}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          onClick={() => navigate(`/employee/projects/${item.project.id}`)}
                          className="border-b border-stone-50 dark:border-stone-800/30 hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <FolderSimple className="w-4 h-4 text-stone-400 shrink-0" />
                              <span className="text-sm font-medium text-stone-900 dark:text-white">{item.project.nom}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">{item.project.clientNom}</td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusPill(item.project.statut)}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {t(`status.${item.project.statut}`)}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-sm text-stone-600 dark:text-stone-300">{item.role}</td>
                          <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                            {item.project.dateDebut ? new Date(item.project.dateDebut).toLocaleDateString("fr-FR") : "-"}
                          </td>
                          <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                            {item.project.dateFinPrevue ? new Date(item.project.dateFinPrevue).toLocaleDateString("fr-FR") : "-"}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-stone-100 dark:divide-stone-800/40">
                {filtered.map((item, index) => {
                  const StatusIcon = getStatusIcon(item.project.statut);
                  return (
                    <motion.button
                      key={`${item.project.id}-${item.affectationId}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      type="button"
                      onClick={() => navigate(`/employee/projects/${item.project.id}`)}
                      className="w-full p-4 text-left hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 dark:text-white truncate">{item.project.nom}</p>
                          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <UsersThree className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.project.clientNom}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shrink-0 ${statusPill(item.project.statut)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {t(`status.${item.project.statut}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                        <span>{t("role")}: {item.role}</span>
                        <span>{item.project.dateDebut ? new Date(item.project.dateDebut).toLocaleDateString("fr-FR") : "-"}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 p-6 sm:p-10 lg:p-12 text-center"
            >
              <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <FolderSimple className="w-6 h-6 text-stone-400 dark:text-stone-500" />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t("employee.noProjects")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Loadable>
    </div>
  );
}

export function EmployeeUploadPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const preselectRef = useRef<{ projectId: string; deliverableId: string } | null>(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<ApiProject[]>([]);

  const [deliverables, setDeliverables] = useState<ApiDeliverable[]>([]);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);

  const [isNewDeliverable, setIsNewDeliverable] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState("");

  const [deliverableName, setDeliverableName] = useState("");
  const [deliverableType, setDeliverableType] = useState<DeliverableType | "">("");
  const [description, setDescription] = useState("");
  const [noteInterne, setNoteInterne] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const state = location.state as { projectId?: number | string; deliverableId?: number | string } | null;
    if (!state?.projectId || !state?.deliverableId) return;

    preselectRef.current = {
      projectId: String(state.projectId),
      deliverableId: String(state.deliverableId),
    };

    setIsNewDeliverable(false);
    setSelectedProjectId(String(state.projectId));
  }, [location.state]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const affs = await affectationsApi.byEmployee(Number(user.id));
        const projectIds = [...new Set((affs.content ?? []).map((a) => a.projetId))];
        const all = projectIds.length ? await projectsApi.batch(projectIds) : [];
        const active = all.filter((p) => p.statut !== "ARCHIVE");
        if (!cancelled) setProjects(active);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) {
      setDeliverables([]);
      return;
    }

    let cancelled = false;
    const loadDeliverables = async () => {
      setLoadingDeliverables(true);
      try {
        const page = await deliverablesApi.byProject(Number(selectedProjectId));
        if (!cancelled) setDeliverables(page.content ?? []);
      } catch {
        if (!cancelled) setDeliverables([]);
      } finally {
        if (!cancelled) setLoadingDeliverables(false);
      }
    };

    loadDeliverables();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    setSelectedDeliverableId("");
  }, [selectedProjectId, isNewDeliverable]);

  useEffect(() => {
    const pending = preselectRef.current;
    if (!pending) return;
    if (isNewDeliverable) return;
    if (pending.projectId !== selectedProjectId) return;

    const exists = deliverables.some((d) => String(d.id) === pending.deliverableId);
    if (!exists) return;

    setSelectedDeliverableId(pending.deliverableId);
    preselectRef.current = null;
  }, [deliverables, isNewDeliverable, selectedProjectId]);

  const canSubmit =
    !!file &&
    file.size > 0 &&
    !!selectedProjectId &&
    (isNewDeliverable || !!selectedDeliverableId) &&
    (isNewDeliverable ? !!deliverableName && !!deliverableType : true);

  const validateFileSelection = (candidate: File | null) => {
    if (!candidate) return;
    if (candidate.size === 0) {
      setError(t("error.emptyFile"));
      setFile(null);
      return;
    }
    if (!isAcceptedFile(candidate)) {
      setError("Type de fichier non supporte pour cet upload.");
      setFile(null);
      return;
    }

    setError("");
    setFile(candidate);
  };

  const onInputFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    validateFileSelection(selected);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const onDropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    validateFileSelection(dropped);
  };

  const handleSubmit = async () => {
    if (!file || !selectedProjectId) return;

    if (file.size === 0) {
      setError(t("error.emptyFile"));
      return;
    }
    setUploading(true);
    setError("");
    setSuccess(false);
    try {
      let deliverableId: number;

      if (isNewDeliverable) {
        if (!deliverableName || !deliverableType) {
          setError("Veuillez remplir les champs obligatoires.");
          return;
        }
        const created = await deliverablesApi.create({
          projetId: Number(selectedProjectId),
          nom: deliverableName,
          type: deliverableType,
          description: description || undefined,
        });
        deliverableId = created.id;
      } else {
        if (!selectedDeliverableId) {
          setError("Veuillez selectionner un livrable.");
          return;
        }
        deliverableId = Number(selectedDeliverableId);
      }

      await versionsApi.upload(deliverableId, file, noteInterne || undefined);

      setSuccess(true);
      setFile(null);
      setDeliverableName("");
      setDescription("");
      setNoteInterne("");
      setSelectedDeliverableId("");
    } catch (e: any) {
      const backendMessage = e?.response?.data?.message || e?.message;
      console.error("Upload error:", e);
      setError(backendMessage || "Upload impossible. Veuillez reessayer.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 text-stone-900 dark:text-white tracking-tight font-normal"
          >
            {t("employee.uploadDeliverable")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-stone-500 dark:text-stone-400"
          >
            Deposez un nouveau livrable ou une nouvelle version.
          </motion.p>
        </div>

      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-900/50 p-1 rounded-xl border border-stone-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsNewDeliverable(true)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors ${
                isNewDeliverable
                  ? "bg-white dark:bg-white/10 shadow-sm text-stone-900 dark:text-white"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              Nouveau
            </button>
            <button
              type="button"
              onClick={() => setIsNewDeliverable(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors ${
                !isNewDeliverable
                  ? "bg-white dark:bg-white/10 shadow-sm text-stone-900 dark:text-white"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              Nouvelle version
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Projet
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects || uploading}
              className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm cursor-pointer"
            >
              <option value="">{loadingProjects ? "Chargement..." : "Selectionner un projet"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.clientNom})
                </option>
              ))}
            </select>
          </div>

          <AnimatePresence mode="wait">
            {isNewDeliverable ? (
              <motion.div
                key="new"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    Nom du livrable *
                  </label>
                  <input
                    value={deliverableName}
                    onChange={(e) => setDeliverableName(e.target.value)}
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm"
                    placeholder="Ex: Homepage v1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    Type *
                  </label>
                  <select
                    value={deliverableType}
                    onChange={(e) => setDeliverableType(e.target.value as DeliverableType | "")}
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm cursor-pointer"
                  >
                    <option value="">Selectionner</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="VIDEO">VIDEO</option>
                    <option value="TEXTE">TEXTE</option>
                    <option value="PDF">PDF</option>
                    <option value="AUDIO">AUDIO</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                    rows={3}
                    className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm resize-none"
                    placeholder="Optionnel..."
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="existing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                  Livrable *
                </label>
                <select
                  value={selectedDeliverableId}
                  onChange={(e) => setSelectedDeliverableId(e.target.value)}
                  disabled={!selectedProjectId || loadingDeliverables || uploading}
                  className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm cursor-pointer"
                >
                  <option value="">
                    {!selectedProjectId
                      ? "Selectionner un projet d'abord"
                      : loadingDeliverables
                        ? "Chargement..."
                        : "Selectionner un livrable"}
                  </option>
                  {deliverables.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom} ({t(`filter.type.${d.type}`) === `filter.type.${d.type}` ? d.type : t(`filter.type.${d.type}`)})
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Note interne (optionnel)
            </label>
            <input
              value={noteInterne}
              onChange={(e) => setNoteInterne(e.target.value)}
              disabled={uploading}
              className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 transition-all text-sm"
              placeholder="Decrivez les changements..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Fichier *
            </label>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDropFile}
              className={`w-full border-2 border-dashed rounded-2xl p-5 sm:p-6 lg:p-8 transition-all ${
                isDragOver
                  ? "border-stone-900 dark:border-white bg-stone-100 dark:bg-stone-900/50"
                  : "border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900/30"
              }`}
            >
              <label className="cursor-pointer block text-center">
                <input
                  type="file"
                  accept=".mp3,.wav,.ogg,.m4a,audio/*,video/*,image/*,application/pdf,text/*"
                  onChange={onInputFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  Glissez-deposez un fichier ici
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                  ou cliquez pour choisir un fichier
                </p>
              </label>

              {file && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-white dark:bg-stone-900/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{file.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Retirer
                  </button>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl"
              >
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30 rounded-xl"
              >
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Upload reussi.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || !canSubmit}
            className="w-full py-4 ikg-gradient-btn rounded-xl font-medium text-sm  transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-stone-200 dark:shadow-none flex items-center justify-center gap-2"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UploadSimple className="w-4 h-4" />
            )}
            {uploading ? "Upload..." : "Confirmer"}
          </button>
        </Card>
      </div>
    </div>
  );
}
