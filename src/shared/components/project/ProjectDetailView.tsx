// Ce fichier gere une partie du frontend.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon as ArrowLeft, CalendarBlankIcon as CalendarBlank, PencilIcon as Pencil, TrashIcon as Trash, UsersIcon as Users, UsersThreeIcon as UsersThree, ArchiveIcon as Archive, ArrowClockwiseIcon as ArrowClockwise, CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useAuth } from "@/core/auth/AuthProvider";
import { affectationsApi, deliverablesApi, projectsApi, usersApi, versionsApi } from "@/core/api/client";
import { useI18n } from "@/core/i18n/I18nProvider";
import { DeliverableCard } from "@/shared/components/ui/DeliverableCard";
import { ProjectDetailSkeleton } from "@/shared/components/skeleton";
import { SecureDeleteModal } from "@/modules/admin/components/SecureDeleteModal";
import { useToast } from "@/shared/components/ui/toast";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";
import { ProjectHistoryTimeline } from "@/shared/components/project/ProjectHistoryTimeline";
import type { ApiAffectation, ApiProject, ApiDeliverable, ApiProjectHistoryEvent, ApiUser, ApiVersion, ProjectStatus } from "@/types/index";
import { normalizeVersions } from "@/shared/utils/versions";
import { getStatusIcon } from "@/shared/utils/status";


type EnrichedDeliverable = ApiDeliverable & {
  latestVersion?: ApiVersion;
  latestVersionId?: number;
  versionLabel: string;
  commentsCount: number;
};

type AvailableClient = { id: number; name: string; email: string };

type ProjectDeletionInfo = {
  hasDeliverables: boolean;
  deliverablesCount: number;
};

function getApiErrorMessage(err: any, fallback: string) {
  const message = err?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

function statusPill(status: ProjectStatus): string {
  switch (status) {
    case "EN_COURS":
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-white/10";
    case "TERMINE":
      return "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-white/10";
    case "ARCHIVE":
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-white/10";
    case "EN_ATTENTE":
      return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-200 dark:border-white/10";
    default:
      return "bg-stone-100 text-stone-700 border-stone-200";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
}

function shouldHideEmployeeProjectAccessMessage(role: string | undefined, message: unknown) {
  if (role !== "EMPLOYE" || typeof message !== "string") return false;
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("pas autoris�") || normalized.includes("not authorized")) &&
    normalized.includes("projet")
  ) || normalized.includes("pas affect� � ce projet");
}

function EditProjectModal({
  isOpen,
  onClose,
  onUpdateProject,
  clients,
  clientsLoading,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (payload: {
    name: string;
    description: string;
    clientId: number;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
  }) => Promise<void>;
  clients: AvailableClient[];
  clientsLoading: boolean;
  project: ApiProject | null;
}) {
  const { t } = useI18n();
  const currentClientMissing =
    !!project?.clientId &&
    !clients.some((client) => String(client.id) === String(project.clientId));

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
    status: "EN_COURS" as ProjectStatus,
  });
  const [errors, setErrors] = useState<{ name?: string; description?: string; clientId?: string; startDate?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !project) return;
    setFormData({
      name: project.nom ?? "",
      description: project.description ?? "",
      clientId: String(project.clientId ?? ""),
      startDate: project.dateDebut ?? "",
      endDate: project.dateFinPrevue ?? "",
      status: project.statut as ProjectStatus,
    });
    setErrors({});
    setSubmitting(false);
  }, [isOpen, project]);

  const validate = () => {
    const next: { name?: string; description?: string; clientId?: string; startDate?: string } = {};
    if (!formData.name.trim()) next.name = t("error_project_name_required");
    if (!formData.description.trim()) next.description = t("error_description_required");
    if (!formData.clientId) next.clientId = t("error_select_client");
    if (!formData.startDate) next.startDate = t("error_start_date_required");
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      await onUpdateProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        clientId: Number(formData.clientId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (error?: string) =>
    `w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm ${
      error ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-stone-700"
    }`;

  return (
    <AnimatePresence>
      {isOpen && project && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("common.edit")}</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{project.nom}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("project.name")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, name: e.target.value }));
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    className={inputClass(errors.name)}
                  />
                  {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("project.description")}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, description: e.target.value }));
                      if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                    }}
                    className={`${inputClass(errors.description)} min-h-[90px] resize-none`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("project.client")}</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, clientId: e.target.value }));
                      if (errors.clientId) setErrors((p) => ({ ...p, clientId: undefined }));
                    }}
                    className={`${inputClass(errors.clientId)} [color-scheme:light] dark:[color-scheme:dark]`}
                    disabled={clientsLoading && clients.length === 0}
                  >
                    <option value="">{clientsLoading ? t("common.loading") : t("select_client")}</option>
                    {currentClientMissing && project ? (
                      <option value={String(project.clientId)}>
                        {project.clientNom}
                      </option>
                    ) : null}
                    {clients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.clientId}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("start_date")}</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, startDate: e.target.value }));
                        if (errors.startDate) setErrors((p) => ({ ...p, startDate: undefined }));
                      }}
                      className={`${inputClass(errors.startDate)} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                    {errors.startDate && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("projects.plannedEnd")}</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                      min={formData.startDate}
                      className={`${inputClass()} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-stone-400 dark:text-stone-500 mb-2 block">{t("status")}</label>
                  <div className="flex flex-wrap gap-2">
                    {(["EN_COURS", "TERMINE", "ARCHIVE"] as ProjectStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, status }))}
                        className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                          formData.status === status
                            ? "ikg-gradient-btn border-stone-900 dark:border-white"
                            : "bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                        }`}
                      >
                        {t(`status.${status}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? t("loading") : t("save_changes")}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function AssignEmployeeModal({
  isOpen,
  onClose,
  onAssign,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (employeeId: string, role: string) => Promise<void>;
}) {
  const { t } = useI18n();

  const [employees, setEmployees] = useState<{ id: number; name: string; avatar?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [errors, setErrors] = useState<{ employee?: string; role?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEmployees = async () => {
      try {
        setIsLoading(true);
        const resp = await usersApi.list({ role: "EMPLOYE", actif: true, size: 500 });
        setEmployees((resp.content ?? []).map((u: ApiUser) => {
          let avatar: string | undefined;
          try {
            const saved = localStorage.getItem(`ikigai-avatar-${u.id}`);
            avatar = saved || undefined;
          } catch {
            avatar = undefined;
          }
          return { id: u.id, name: `${u.prenom} ${u.nom}`.trim(), avatar };
        }));
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          onClose();
          return;
        }
        setErrors((prev) => ({ ...prev, employee: t("admin.users.loadFailed") }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, [isOpen, onClose, t]);

  useEffect(() => {
    if (!isOpen) {
      setEmployees([]);
      setIsLoading(false);
      setSelectedEmployee("");
      setProjectRole("");
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  const validate = () => {
    const next: { employee?: string; role?: string } = {};
    if (!selectedEmployee) next.employee = t("admin.projects.requiredFields");
    if (!projectRole.trim()) next.role = t("admin.projects.requiredFields");
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      setSubmitting(true);
      await onAssign(selectedEmployee, projectRole.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("assign_employee")}</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t("assign_employee_desc")}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide block">
                    {t("employees")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {isLoading ? (
                      <div className="col-span-2 text-center text-sm text-stone-500">{t("common.loading")}</div>
                    ) : (
                      employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(String(emp.id));
                            if (errors.employee) setErrors((p) => ({ ...p, employee: undefined }));
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-2 ${
                            selectedEmployee === String(emp.id)
                              ? "border-stone-900 dark:border-white ikg-gradient-btn"
                              : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                        >
                          <DefaultAvatar
                            src={emp.avatar}
                            alt={emp.name}
                            size="md"
                            className="shrink-0"
                          />
                          {emp.name}
                        </button>
                      ))
                    )}
                  </div>
                  {errors.employee && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.employee}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide block">
                    {t("role_caps")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectRole}
                    onChange={(e) => {
                      setProjectRole(e.target.value);
                      if (errors.role) setErrors((p) => ({ ...p, role: undefined }));
                    }}
                    placeholder={t("role_placeholder")}
                    className={`w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm ${
                      errors.role ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-stone-700"
                    }`}
                  />
                  {errors.role && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.role}</p>}
                </div>

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? t("loading") : t("assign_btn")}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function ManageAffectationModal({
  isOpen,
  onClose,
  employeeName,
  employeeAvatar,
  initialRole,
  onSave,
  onRemove,
}: {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeAvatar?: string | null;
  initialRole: string;
  onSave: (role: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRole(initialRole);
    setError(null);
    setSaving(false);
    setRemoving(false);
  }, [initialRole, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = role.trim();
    if (!trimmed) {
      setError(t("admin.projects.requiredFields"));
      return;
    }
    try {
      setSaving(true);
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setRemoving(true);
      await onRemove();
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-3">
                  <DefaultAvatar
                    src={employeeAvatar || undefined}
                    alt={employeeName}
                    size="lg"
                    className="shrink-0"
                  />
                  <div>
                    <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("common.edit")}</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{employeeName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide block">
                    {t("role_caps")}
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t("role_placeholder")}
                    className={`w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm ${
                      error ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-stone-700"
                    }`}
                  />
                  {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
                </div>

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={saving || removing}
                    className="flex-1 px-4 py-3 border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-950/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {removing ? t("loading") : t("common.delete")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={saving || removing}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? t("loading") : t("save_changes")}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ProjectDetailView({
  projectId,
  backHref,
  deliverableHref,
  allowDeliverableDelete = false,
  showHistoryTab = true,
}: {
  projectId: number;
  backHref: string;
  deliverableHref: (deliverableId: number) => string;
  allowDeliverableDelete?: boolean;
  showHistoryTab?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [affectations, setAffectations] = useState<ApiAffectation[]>([]);
  const [deliverables, setDeliverables] = useState<EnrichedDeliverable[]>([]);
  const [storedHistory, setStoredHistory] = useState<ApiProjectHistoryEvent[]>([]);
  const [deliverablesPage, setDeliverablesPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  const [clients, setClients] = useState<AvailableClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [assignEmployeeOpen, setAssignEmployeeOpen] = useState(false);
  const [affectationModalState, setAffectationModalState] = useState<{
    isOpen: boolean;
    affectation: { affectationId: number; id: number; name: string; role: string; avatar?: string } | null;
  }>({
    isOpen: false,
    affectation: null,
  });
  const [deleteProjectState, setDeleteProjectState] = useState<{ isOpen: boolean; deletionInfo: ProjectDeletionInfo | null }>({
    isOpen: false,
    deletionInfo: null,
  });
  const [archiveProjectState, setArchiveProjectState] = useState<{ isOpen: boolean; project: ApiProject | null }>({
    isOpen: false,
    project: null,
  });
  const [deleteDeliverableState, setDeleteDeliverableState] = useState<{ isOpen: boolean; deliverable: EnrichedDeliverable | null }>({
    isOpen: false,
    deliverable: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, a, d, h] = await Promise.all([
          projectsApi.byId(projectId),
          affectationsApi.byProject(projectId),
          deliverablesApi.byProject(projectId),
          projectsApi.history(projectId).catch(() => []),
        ]);

        if (cancelled) return;

        setProject(p);
        setAffectations(a.content ?? []);
        setStoredHistory(Array.isArray(h) ? h : []);

        const deliverablesList = d.content ?? [];
        let versionsByDeliverableId = new Map<number, ApiVersion[]>();
        for (const item of deliverablesList) {
          if (item.versions && item.versions.length > 0) {
            versionsByDeliverableId.set(item.id, item.versions);
          }
        }
        const missingVersionIds = deliverablesList
          .filter((item) => !versionsByDeliverableId.has(item.id))
          .map((item) => item.id);

        if (missingVersionIds.length > 0) {
          try {
            const allVersions = await versionsApi.batchByDeliverables(missingVersionIds);
            for (const v of allVersions) {
              const existing = versionsByDeliverableId.get(v.livrableId) ?? [];
              existing.push(v);
              versionsByDeliverableId.set(v.livrableId, existing);
            }
          } catch (e: any) {
            for (const item of deliverablesList) {
              if (!versionsByDeliverableId.has(item.id)) {
                try {
                  const versionPage = await versionsApi.byDeliverable(item.id);
                  if (versionPage.content?.length > 0) {
                    versionsByDeliverableId.set(item.id, versionPage.content);
                  }
                } catch {
                }
              }
            }
          }
        }

        const enriched = deliverablesList.map((item) => {
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

        setDeliverables(enriched);
      } catch (e: any) {
        const errorMessage = e?.response?.data?.message || e?.message || t("common.error");
        setError(errorMessage);
        setProject(null);
        setAffectations([]);
        setDeliverables([]);
        setStoredHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshTick, t]);

  useEffect(() => {
    setDeliverablesPage(1);
  }, [deliverables.length, activeTab]);

  useEffect(() => {
    if (clientsLoading || clients.length > 0) return;

    let cancelled = false;
    const fetchClients = async () => {
      try {
        setClientsLoading(true);
        const resp = await usersApi.list({ role: "CLIENT", actif: true, size: 200 });
        const mapped = (resp.content ?? []).map((c: ApiUser) => ({
          id: c.id,
          name: `${c.prenom} ${c.nom}`.trim(),
          email: c.email,
        }));
        if (!cancelled) setClients(mapped);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, t("common.error")));
        }
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    };

    fetchClients();
    return () => {
      cancelled = true;
    };
  }, [clients.length, clientsLoading, t, toast]);

  const employees = useMemo(() => {
    return affectations.map((a) => {
      let avatar: string | undefined;
      try {
        const saved = localStorage.getItem(`ikigai-avatar-${a.employeId}`);
        avatar = saved || undefined;
      } catch {
        avatar = undefined;
      }
      return {
        affectationId: a.id,
        id: a.employeId,
        name: `${a.employePrenom} ${a.employeNom}`.trim(),
        role: a.roleDansProjet,
        avatar,
      };
    });
  }, [affectations]);

  const history = useMemo(() => {
    return [...storedHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [storedHistory]);

  const canDeleteDeliverable = (deliverable: EnrichedDeliverable) => {
    if (!allowDeliverableDelete) return false;
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "EMPLOYE") {
      const isCreator = deliverable.deposeParId === Number(user.id);
      const isEmpty = (deliverable.versions ?? []).length === 0;
      return isCreator && isEmpty;
    }
    return false;
  };

  const handleDeleteDeliverable = (deliverable: EnrichedDeliverable) => {
    setDeleteDeliverableState({ isOpen: true, deliverable });
  };

  const openDeleteProjectModal = async (p: ApiProject) => {
    try {
      const info = await projectsApi.deletionInfo(Number(p.id));
      setDeleteProjectState({ isOpen: true, deletionInfo: info });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
    }
  };

  const handleArchiveProject = async (p: ApiProject) => {
    if (p.statut !== "TERMINE") {
      toast.error("Archivage autoris� uniquement pour les projets TERMIN�S.");
      return;
    }
    setArchiveProjectState({ isOpen: true, project: p });
  };

  const handleArchiveProjectConfirm = async (adminPassword?: string) => {
    if (!archiveProjectState.project || !adminPassword) return;
    const projectToArchive = archiveProjectState.project;
    try {
      await projectsApi.archive(projectToArchive.id, adminPassword);
      setProject({ ...projectToArchive, statut: "ARCHIVE" });
      setArchiveProjectState({ isOpen: false, project: null });
      toast.success(t("project.archived"));
      setRefreshTick((v) => v + 1);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleRestoreProject = async (p: ApiProject) => {
    try {
      await projectsApi.unarchive(p.id);
      setProject({ ...p, statut: "EN_COURS" });
      toast.success(t("project.restored"));
      setRefreshTick((v) => v + 1);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteProject = async (p: ApiProject) => {
    await openDeleteProjectModal(p);
  };

  const handleEditProject = async (p: ApiProject) => {
    setProject(p);
    setEditProjectOpen(true);
  };

  const handleAssignEmployees = async (p: ApiProject) => {
    setProject(p);
    setAssignEmployeeOpen(true);
  };

  const handleUpdateProject = async (payload: {
    name: string;
    description: string;
    clientId: number;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
  }) => {
    if (!project) return;
    try {
      await projectsApi.update(Number(project.id), {
        nom: payload.name,
        description: payload.description,
        clientId: payload.clientId,
        dateDebut: payload.startDate,
        dateFinPrevue: payload.endDate || null,
        statut: payload.status,
      });
      toast.success(t("save_success"));
      setRefreshTick((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleAssignEmployee = async (employeeId: string, role: string) => {
    if (!project) return;
    try {
      await affectationsApi.create({ projetId: Number(project.id), employeId: Number(employeeId), roleDansProjet: role });
      toast.success(t("project.history.employeeAssigned"));
      setRefreshTick((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleUpdateAffectation = async (affectationId: number, employeId: number, role: string) => {
    if (!project) return;
    try {
      await affectationsApi.update(affectationId, {
        projetId: Number(project.id),
        employeId,
        roleDansProjet: role,
      });
      toast.success(t("save_success"));
      setRefreshTick((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleRemoveAffectation = async (affectationId: number) => {
    if (!project) return;
    try {
      await affectationsApi.remove(affectationId);
      toast.success(t("delete_success") || t("common.delete"));
      setRefreshTick((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleDeleteProjectPermanently = async (adminPassword?: string) => {
    if (!project || !deleteProjectState.deletionInfo) return;
    const requiresStrongFlow = deleteProjectState.deletionInfo.hasDeliverables;
    if (requiresStrongFlow && !adminPassword) return;

    const passwordToSend = requiresStrongFlow ? adminPassword! : "";
    await projectsApi.delete(Number(project.id), passwordToSend);
    toast.success(t("delete_success") || t("delete_permanently"));
    navigate(backHref, { replace: true });
  };

  const executeDeleteDeliverable = async () => {
    if (!deleteDeliverableState.deliverable || !project) return;
    const deliverable = deleteDeliverableState.deliverable;
    try {
      await deliverablesApi.delete(Number(deliverable.id));
      setDeliverables((prev) => prev.filter((d) => d.id !== deliverable.id));
      toast.success(t("admin.deliverableDeleted"));
      setDeleteDeliverableState({ isOpen: false, deliverable: null });
      setRefreshTick((v) => v + 1);
    } catch (e: any) {
      const message = e?.response?.data?.message;
      if (shouldHideEmployeeProjectAccessMessage(user?.role, message)) return;
      toast.error(typeof message === "string" ? message : t("common.error"));
      throw e;
    }
  };

  if (loading) {
    return <ProjectDetailSkeleton showHistoryTab={showHistoryTab} />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(backHref, { replace: true })}
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("review.back")}
        </button>
        <div className="mt-10 p-10 bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-200/60 dark:border-red-900/30 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{t("common.error")}</p>
          <p className="text-red-500 dark:text-red-400/70 text-sm mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm"
            type="button"
          >
            {t("common.retry") || "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(backHref, { replace: true })}
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("review.back")}
        </button>
        <div className="mt-10 p-10 bg-white/50 dark:bg-stone-900/20 rounded-3xl border border-stone-200/60 dark:border-white/10 text-center">
          <p className="text-stone-500 dark:text-stone-400">{t("project.notFound")}</p>
        </div>
      </div>
    );
  }

  const ProjectStatusIcon = getStatusIcon(project.statut);
  const deliverablesPerPage = 9;
  const deliverablesTotalPages = Math.max(1, Math.ceil(deliverables.length / deliverablesPerPage));
  const paginatedDeliverables = deliverables.slice(
    (deliverablesPage - 1) * deliverablesPerPage,
    deliverablesPage * deliverablesPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <button
            onClick={() => navigate(backHref)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors uppercase tracking-widest"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("review.back")}
          </button>

          <div className="mt-4 flex items-center gap-3 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-stone-900 dark:text-white truncate">
              {project.nom}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusPill(
                project.statut
              )}`}
            >
              <ProjectStatusIcon className="w-3.5 h-3.5" />
              {t(`status.${project.statut}`)}
            </span>
          </div>

          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 truncate">
            {t("project.client")}: {project.clientNom}
          </p>
        </div>

        {user?.role === "ADMIN" && (
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => handleAssignEmployees(project)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-white/10"
              type="button"
            >
              <Users className="w-3.5 h-3.5" />
              {t("assign")}
            </button>
            <button
              onClick={() => handleEditProject(project)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-white/10"
              type="button"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("common.edit")}
            </button>
            {project.statut === "ARCHIVE" ? (
              <button
                onClick={() => handleRestoreProject(project)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                type="button"
              >
                <ArrowClockwise className="w-3.5 h-3.5" />
                {t("restore")}
              </button>
            ) : (
              <button
                onClick={() => handleArchiveProject(project)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-white/10"
                type="button"
              >
                <Archive className="w-3.5 h-3.5" />
                {t("archive")}
              </button>
            )}
            <button
              onClick={() => handleDeleteProject(project)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors border border-red-200 dark:border-red-900/50"
              type="button"
            >
              <Trash className="w-3.5 h-3.5" />
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>

      <div className="mb-10">
        <div className="inline-flex items-center gap-1 bg-white/60 dark:bg-stone-900/30 backdrop-blur-xl rounded-2xl border border-stone-200/60 dark:border-white/10 p-1.5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === "overview"
                ? "ikg-gradient-btn"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
            }`}
            type="button"
          >
            {t("project.overview")}
          </button>
          {showHistoryTab && (
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                activeTab === "history"
                  ? "ikg-gradient-btn"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
              type="button"
            >
              {t("project.history")}
            </button>
          )}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <div className="p-6 bg-white/60 dark:bg-stone-900/30 backdrop-blur-xl rounded-3xl border border-stone-200/60 dark:border-white/10 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 border border-stone-200 dark:border-white/10">
                    <CalendarBlank className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                      {t("project.start")}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 dark:text-white mt-1">
                      {formatDate(project.dateDebut)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 border border-stone-200 dark:border-white/10">
                    <CalendarBlank className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                      {t("projects.plannedEnd")}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 dark:text-white mt-1">
                      {formatDate(project.dateFinPrevue)}
                    </p>
                  </div>
                </div>
              </div>

              {project.description && (
                <div className="mt-5 pt-5 border-t border-stone-100 dark:border-white/10">
                  <p className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    {t("project.description")}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.3em]">
                  {t("project.allDeliverables")} ({deliverables.length})
                </h2>
                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800 ml-4" />
              </div>

              {deliverables.length === 0 ? (
                <div className="py-20 text-center text-stone-400 bg-white/40 dark:bg-white/[0.02] rounded-[2rem] border border-stone-200/50 dark:border-white/[0.05] border-dashed">
                  {t("project.noDeliverables")}
                </div>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {paginatedDeliverables.map((d) => (
                      <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="relative">
                          {canDeleteDeliverable(d) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDeliverable(d);
                              }}
                              className="absolute top-3 right-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/70 dark:border-white/10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shadow-sm text-xs font-semibold"
                              type="button"
                            >
                              <Trash className="w-4 h-4" />
                              {t("common.delete")}
                            </button>
                          )}
                          <DeliverableCard
                            id={String(d.id)}
                            title={d.nom}
                            version={d.versionLabel}
                            status={d.statut}
                            type={d.type}
                            commentsCount={d.commentsCount}
                            projectName={d.projetNom}
                            latestVersionId={d.latestVersionId}
                            fichierUrl={d.latestVersion?.fichierUrl}
                            dateCreation={d.dateCreation}
                            showDeleteAction={allowDeliverableDelete && canDeleteDeliverable(d)}
                            onDelete={() => handleDeleteDeliverable(d)}
                            onClick={(id) => navigate(deliverableHref(Number(id)))}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
              {deliverablesTotalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setDeliverablesPage((p) => Math.max(1, p - 1))}
                    disabled={deliverablesPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                    type="button"
                  >
                    <CaretLeft className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 inline-flex items-center">
                    {deliverablesPage} / {deliverablesTotalPages}
                  </span>
                  <button
                    onClick={() => setDeliverablesPage((p) => Math.min(deliverablesTotalPages, p + 1))}
                    disabled={deliverablesPage === deliverablesTotalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 disabled:opacity-50 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                    type="button"
                  >
                    <CaretRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <UsersThree className="w-4 h-4 text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-white tracking-tight">
                {t("project.team")} ({employees.length})
              </h2>
            </div>

            <div className="space-y-3">
              {employees.length === 0 ? (
                <div className="text-sm text-stone-500 dark:text-stone-400 p-6 bg-white/50 dark:bg-stone-900/20 rounded-2xl border border-stone-200/60 dark:border-white/10">
                  {t("project.noTeam")}
                </div>
              ) : (
                employees.map((e) => (
                  <button
                    key={e.affectationId}
                    type="button"
                    onClick={() => {
                      if (user?.role !== "ADMIN") return;
                      setAffectationModalState({ isOpen: true, affectation: e });
                    }}
                    className={`w-full text-left flex items-center gap-4 p-4 bg-white/60 dark:bg-stone-900/40 backdrop-blur-xl rounded-2xl border border-stone-200/60 dark:border-white/10 shadow-sm ${
                      user?.role === "ADMIN"
                        ? "hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                        : "cursor-default"
                    }`}
                    title={user?.role === "ADMIN" ? t("common.edit") : undefined}
                  >
                    <DefaultAvatar
                      src={e.avatar}
                      alt={e.name}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{e.name}</p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest font-bold mt-1 truncate">
                        {e.role}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showHistoryTab && activeTab === "history" && (
        <div className="space-y-6">
          <h3 className="text-[11px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">
            {t("project.activityLog")}
          </h3>
          <ProjectHistoryTimeline items={history} emptyLabel={t("project.noHistory")} />
        </div>
      )}

      <EditProjectModal
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        onUpdateProject={handleUpdateProject}
        clients={clients}
        clientsLoading={clientsLoading}
        project={project}
      />

      <AssignEmployeeModal
        isOpen={assignEmployeeOpen}
        onClose={() => setAssignEmployeeOpen(false)}
        onAssign={handleAssignEmployee}
      />

      <ManageAffectationModal
        isOpen={affectationModalState.isOpen}
        onClose={() => setAffectationModalState({ isOpen: false, affectation: null })}
        employeeName={affectationModalState.affectation?.name ?? ""}
        employeeAvatar={affectationModalState.affectation?.avatar}
        initialRole={affectationModalState.affectation?.role ?? ""}
        onSave={async (role) => {
          if (!affectationModalState.affectation) return;
          await handleUpdateAffectation(
            affectationModalState.affectation.affectationId,
            affectationModalState.affectation.id,
            role
          );
        }}
        onRemove={async () => {
          if (!affectationModalState.affectation) return;
          await handleRemoveAffectation(affectationModalState.affectation.affectationId);
        }}
      />

      <SecureDeleteModal
        isOpen={archiveProjectState.isOpen}
        onClose={() => setArchiveProjectState({ isOpen: false, project: null })}
        title={`${t("archive")} � ${archiveProjectState.project?.nom ?? ""}`}
        description="Double v�rification + mot de passe administrateur requis."
        strongMode={true}
        confirmLabel={t("archive")}
        confirmButtonClassName="bg-stone-800 text-white hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600"
        checkTextA="Je confirme que ce projet est termin�."
        checkTextB="Je comprends que l'archivage limite les modifications."
        onConfirm={handleArchiveProjectConfirm}
      />

      <SecureDeleteModal
        isOpen={deleteProjectState.isOpen}
        onClose={() => setDeleteProjectState({ isOpen: false, deletionInfo: null })}
        title={t("delete_permanently")}
        description={
          deleteProjectState.deletionInfo?.hasDeliverables
            ? t("delete_project_strong_warning", { count: deleteProjectState.deletionInfo.deliverablesCount })
            : t("delete_project_confirm")
        }
        strongMode={!!deleteProjectState.deletionInfo?.hasDeliverables}
        onConfirm={handleDeleteProjectPermanently}
      />

      <SecureDeleteModal
        isOpen={deleteDeliverableState.isOpen}
        onClose={() => setDeleteDeliverableState({ isOpen: false, deliverable: null })}
        title={t("delete_deliverable_confirm")}
        description={t("delete_deliverable_warning", { name: deleteDeliverableState.deliverable?.nom ?? "" })}
        strongMode={true}
        onConfirm={executeDeleteDeliverable}
      />
    </div>
  );
}
