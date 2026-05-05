// Ce fichier gere une partie du frontend.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {

  Archive,
  Calendar,
  Eye,
  Filter,
  FolderKanban,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { affectationsApi, projectsApi, usersApi } from "@/core/api/client";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { PageLoader } from "@/shared/components/feedback/PageLoader";
import { useToast } from "@/shared/components/ui/toast";
import { DefaultAvatar } from "@/shared/components/ui/DefaultAvatar";
import type { ApiAffectation, ApiProject, ApiUser, ProjectStatus } from "@/types/index";
import { getStatusIcon } from "@/shared/utils/status";
import { SecureDeleteModal } from "@/modules/admin/components/SecureDeleteModal";

type ProjectFilters = {
  status: "" | ProjectStatus;
  client: string;
  startDate: string;
  endDate: string;
};

type AvailableClient = { id: number; name: string; email: string };

type ProjectEmployee = {
  id: number;
  name: string;
  role: string;
  affectationId: number;
  avatar?: string;
};

type ProjectCard = {
  id: string;
  name: string;
  description: string;
  client: string;
  clientId: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  assignedEmployees: ProjectEmployee[];
};

type ProjectDeletionInfo = {
  hasDeliverables: boolean;
  deliverablesCount: number;
};

function getApiErrorMessage(err: any, fallback: string) {
  const message = err?.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

function getProjectStatusBadge(status: ProjectStatus) {
  switch (status) {
    case "EN_COURS":
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
    case "TERMINE":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
    case "ARCHIVE":
      return "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
    case "EN_ATTENTE":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
    case "PLANIFIE":
      return "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800/50";
    default:
      return "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50";
  }
}

function AddProjectModal({
  isOpen,
  onClose,
  onAddProject,
  clients,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (payload: { name: string; description: string; clientId: number; startDate: string; endDate: string }) => void;
  clients: AvailableClient[];
}) {
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
  });

  const [errors, setErrors] = useState<{ name?: string; description?: string; clientId?: string; startDate?: string }>({});

  const validate = () => {
    const next: { name?: string; description?: string; clientId?: string; startDate?: string } = {};
    if (!formData.name.trim()) next.name = t("error_project_name_required");
    if (!formData.description.trim()) next.description = t("error_description_required");
    if (!formData.clientId) next.clientId = t("error_select_client");
    if (!formData.startDate) next.startDate = t("error_start_date_required");
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onAddProject({
      name: formData.name.trim(),
      description: formData.description.trim(),
      clientId: Number(formData.clientId),
      startDate: formData.startDate,
      endDate: formData.endDate,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({ name: "", description: "", clientId: "", startDate: "", endDate: "" });
    setErrors({});
    onClose();
  };

  const inputClass = (error?: string) =>
    `w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:bg-white dark:focus:bg-stone-900 transition-all text-sm ${
      error ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-stone-700"
    }`;

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
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("add_project")}</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t("create_project_desc")}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    <FolderKanban className="w-3 h-3" />
                    {t("project_name")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, name: e.target.value }));
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    placeholder={t("project_name_placeholder")}
                    className={inputClass(errors.name)}
                  />
                  {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("description")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, description: e.target.value }));
                      if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                    }}
                    placeholder={t("description_placeholder")}
                    className={`${inputClass(errors.description)} min-h-[120px] resize-none`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    <Users className="w-3 h-3" />
                    {t("client")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, clientId: e.target.value }));
                      if (errors.clientId) setErrors((p) => ({ ...p, clientId: undefined }));
                    }}
                    className={`${inputClass(errors.clientId)} cursor-pointer [color-scheme:light] dark:[color-scheme:dark]`}
                  >
                    <option value="" className="dark:bg-[#111113]">
                      {t("select_client")}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)} className="dark:bg-[#111113]">
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.clientId}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3 h-3" />
                      {t("start_date")}
                      <span className="text-red-400 normal-case ml-0.5">*</span>
                    </label>
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
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3 h-3" />
                      {t("projects.plannedEnd")}
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                      min={formData.startDate}
                      className={`${inputClass()} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                    <p className="text-[10px] text-stone-400 dark:text-stone-600 mt-1">{t("optional")}</p>
                  </div>
                </div>

                <div className="h-px bg-stone-100 dark:bg-stone-800/60" />

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium  transition-colors shadow-sm"
                  >
                    {t("create_project")}
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

function EditProjectModal({
  isOpen,
  onClose,
  onUpdateProject,
  clients,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (
    projectId: string,
    payload: { name: string; description: string; clientId: number; startDate: string; endDate: string; status: ProjectStatus }
  ) => void;
  clients: AvailableClient[];
  project: ProjectCard | null;
}) {
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
    status: "EN_COURS" as ProjectStatus,
  });

  const [errors, setErrors] = useState<{ name?: string; description?: string; clientId?: string; startDate?: string }>({});

  useEffect(() => {
    if (!isOpen || !project) return;
    setFormData({
      name: project.name,
      description: project.description,
      clientId: String(project.clientId || ""),
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      status: project.status,
    });
    setErrors({});
  }, [isOpen, project]);

  const validate = () => {
    const next: { name?: string; description?: string; clientId?: string; startDate?: string } = {};
    if (!formData.name.trim()) next.name = t("error_project_name_required");
    if (!formData.description.trim()) next.description = t("error_description_required");
    if (!formData.clientId) next.clientId = t("error_select_client");
    if (!formData.startDate) next.startDate = t("error_start_date_required");
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onUpdateProject(project.id, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      clientId: Number(formData.clientId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
    });
    onClose();
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
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">
                    {t("project.editTitle")}
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t("project.editSubtitle")}</p>
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
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    <FolderKanban className="w-3 h-3" />
                    {t("project_name")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, name: e.target.value }));
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                    placeholder={t("project_name_placeholder")}
                    className={inputClass(errors.name)}
                  />
                  {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    {t("description")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, description: e.target.value }));
                      if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                    }}
                    placeholder={t("description_placeholder")}
                    className={`${inputClass(errors.description)} min-h-[120px] resize-none`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                    <Users className="w-3 h-3" />
                    {t("client")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, clientId: e.target.value }));
                      if (errors.clientId) setErrors((p) => ({ ...p, clientId: undefined }));
                    }}
                    className={`${inputClass(errors.clientId)} cursor-pointer [color-scheme:light] dark:[color-scheme:dark]`}
                  >
                    <option value="" className="dark:bg-[#111113]">
                      {t("select_client")}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)} className="dark:bg-[#111113]">
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.clientId}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3 h-3" />
                      {t("start_date")}
                      <span className="text-red-400 normal-case ml-0.5">*</span>
                    </label>
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
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3 h-3" />
                      {t("projects.plannedEnd")}
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                      min={formData.startDate}
                      className={`${inputClass()} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                    <p className="text-[10px] text-stone-400 dark:text-stone-600 mt-1">{t("optional")}</p>
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium  transition-colors shadow-sm"
                  >
                    {t("save_changes")}
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
  onAssign: (employeeId: string, role: string) => void;
  projectId: string;
}) {
  const { t } = useI18n();

  const [employees, setEmployees] = useState<{ id: number; name: string; avatar?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [errors, setErrors] = useState<{ employee?: string; role?: string }>({});

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

  const validate = () => {
    const next: { employee?: string; role?: string } = {};
    if (!selectedEmployee) next.employee = t("admin.projects.requiredFields");
    if (!projectRole.trim()) next.role = t("admin.projects.requiredFields");
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onAssign(selectedEmployee, projectRole.trim());
    handleClose();
  };

  const handleClose = () => {
    setSelectedEmployee("");
    setProjectRole("");
    setErrors({});
    onClose();
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
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-stone-800/60 rounded-2xl shadow-2xl shadow-stone-200/40 dark:shadow-black/60 w-full max-w-md pointer-events-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800/60">
                <div>
                  <h2 className="text-lg tracking-tight text-stone-900 dark:text-white">{t("assign_employee")}</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t("assign_employee_desc")}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
                    <Users className="w-3 h-3" />
                    {t("employee_role")}
                    <span className="text-red-400 normal-case ml-0.5">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 px-4 py-3 ikg-gradient-btn rounded-xl text-sm font-medium  transition-colors shadow-sm"
                  >
                    {t("assign_btn")}
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

                <div className="flex flex-col sm:flex-row gap-3">
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

export function AdminProjectsPage() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { isFullyReady, user } = useAuth();
  const toast = useToast();

  const userDataCache = useRef<Record<string, any>>({});

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [filters, setFilters] = useState<ProjectFilters>({ status: "", client: "", startDate: "", endDate: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalState, setEditModalState] = useState<{ isOpen: boolean; project: ProjectCard | null }>({
    isOpen: false,
    project: null,
  });
  const [assignModalState, setAssignModalState] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null,
  });
  const [affectationModalState, setAffectationModalState] = useState<{
    isOpen: boolean;
    projectId: string | null;
    affectation: ProjectEmployee | null;
  }>({
    isOpen: false,
    projectId: null,
    affectation: null,
  });
  const [deleteProjectState, setDeleteProjectState] = useState<{
    isOpen: boolean;
    project: ProjectCard | null;
    deletionInfo: ProjectDeletionInfo | null;
  }>({
    isOpen: false,
    project: null,
    deletionInfo: null,
  });
  const [archiveProjectState, setArchiveProjectState] = useState<{ isOpen: boolean; project: ProjectCard | null }>({
    isOpen: false,
    project: null,
  });

  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [clients, setClients] = useState<AvailableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem("ikg:projectAction");
    if (!stored) {
      return;
    }

    try {
      const { action, project, projectId } = JSON.parse(stored);
      sessionStorage.removeItem("ikg:projectAction");

      if (action === "assign" && projectId) {
        setAssignModalState({ isOpen: true, projectId });
      } else if (action === "edit" && project) {
        setEditModalState({ isOpen: true, project });
      } else if (action === "delete" && project) {
        const p = project;
        setTimeout(() => {
          projectsApi.deletionInfo(Number(p.id)).then((info) => {
            setDeleteProjectState({
              isOpen: true,
              project: p,
              deletionInfo: info,
            });
          }).catch(() => {
            toast.error(getApiErrorMessage(null, t("common.error")));
          });
        }, 0);
      }
    } catch (e) {
      console.error("[ProjectsPage] Error parsing sessionStorage:", e);
      sessionStorage.removeItem("ikg:projectAction");
    }
  }, []);

  useEffect(() => {
    if (!isFullyReady || !user) return;

    const cacheKey = "projects-all";
    const clientsCacheKey = `clients-list-active`;

    const fetchData = async () => {
      const hasClientsCache = !!userDataCache.current[clientsCacheKey];
      const hasProjectsCache = !!userDataCache.current[cacheKey];

      if (hasClientsCache) setClients(userDataCache.current[clientsCacheKey]);

      const fetchClients = async () => {
        try {
          const data = await usersApi.list({ role: "CLIENT", actif: true, size: 100 });
          const mappedClients = (data.content ?? []).map((c: ApiUser) => ({
            id: c.id,
            name: `${c.prenom} ${c.nom}`.trim(),
            email: c.email,
          }));
          setClients(mappedClients);
          userDataCache.current[clientsCacheKey] = mappedClients;
        } catch {
        }
      };

      if (!hasClientsCache) await fetchClients();
      else fetchClients();

      if (hasProjectsCache) setProjects(userDataCache.current[cacheKey]);
      setLoading(true);

      setError(null);
      try {
        const pageSize = 100;
        const allProjects: ApiProject[] = [];
        let page = 0;
        let totalPages = 1;
        let safety = 0;

        do {
          const resp = await projectsApi.list({ page, size: pageSize });
          allProjects.push(...(resp.content ?? []));
          totalPages = Math.max(1, resp.totalPages ?? 1);
          page += 1;
          safety += 1;
          if (safety > 300) break;
        } while (page < totalPages);

        const dedupedProjects = Array.from(
          allProjects.reduce((map, project) => map.set(project.id, project), new Map<number, ApiProject>()).values()
        );

        const ids = dedupedProjects.map((p) => p.id);
        let affectations: ApiAffectation[] = [];
        try {
          affectations = await affectationsApi.batchByProjects(ids);
        } catch {
          affectations = [];
        }

        const byProject = new Map<number, ProjectEmployee[]>();
        for (const a of affectations) {
          let avatar: string | undefined;
          try {
            const saved = localStorage.getItem(`ikigai-avatar-${a.employeId}`);
            avatar = saved || undefined;
          } catch {
            avatar = undefined;
          }
          const entry: ProjectEmployee = {
            id: a.employeId,
            name: `${a.employePrenom} ${a.employeNom}`.trim(),
            role: a.roleDansProjet,
            affectationId: a.id,
            avatar,
          };
          const existing = byProject.get(a.projetId) ?? [];
          existing.push(entry);
          byProject.set(a.projetId, existing);
        }

        const mapped: ProjectCard[] = dedupedProjects.map((p: ApiProject) => ({
          id: String(p.id),
          name: p.nom,
          description: p.description || "",
          client: p.clientNom || "",
          clientId: p.clientId || 0,
          status: p.statut as ProjectStatus,
          startDate: p.dateDebut || "",
          endDate: p.dateFinPrevue || "",
          assignedEmployees: byProject.get(p.id) ?? [],
        }));
        setProjects(mapped);
        userDataCache.current[cacheKey] = mapped;
      } catch (err: any) {
        if (err?.response?.status !== 401) setError(getApiErrorMessage(err, t("common.error")));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isFullyReady, user?.id, refreshTrigger, t]);

  if (!isFullyReady) {
    return <PageLoader minHeightClassName="min-h-[400px]" variant="table" />;
  }

  const getLocale = () => (language === "AR" ? "fr-FR" : language === "EN" ? "en-US" : "fr-FR");

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q);

      const matchesStatus = !filters.status || p.status === filters.status;
      const matchesClient = !filters.client || p.client === filters.client;

      const matchesStart = !filters.startDate || (p.startDate && p.startDate >= filters.startDate);
      const matchesEnd = !filters.endDate || (p.endDate && p.endDate <= filters.endDate);

      return matchesQuery && matchesStatus && matchesClient && matchesStart && matchesEnd;
    });
  }, [projects, searchQuery, filters.status, filters.client, filters.startDate, filters.endDate]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const availableClients = Array.from(new Set(projects.map((p) => p.client).filter(Boolean))).sort();

  const activeFiltersCount = [filters.status, filters.client, filters.startDate, filters.endDate].filter((v) => v).length;

  const handleResetFilters = () => {
    setFilters({ status: "", client: "", startDate: "", endDate: "" });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const removeFilter = (key: keyof ProjectFilters) => {
    setFilters((prev) => ({ ...prev, [key]: "" as any }));
    setCurrentPage(1);
  };

  const handleAddProject = async (payload: { name: string; description: string; clientId: number; startDate: string; endDate: string }) => {
    try {
      await projectsApi.create({
        nom: payload.name,
        description: payload.description,
        clientId: payload.clientId,
        dateDebut: payload.startDate,
        dateFinPrevue: payload.endDate || null,
        statut: "EN_COURS",
      });
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((p) => p + 1);
      toast.success(t("admin.projects.addTitle"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.projects.createFailed")));
    }
  };

  const handleAssignEmployee = async (projectId: string, employeeId: string, role: string) => {
    try {
      await affectationsApi.create({ projetId: Number(projectId), employeId: Number(employeeId), roleDansProjet: role });
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((p) => p + 1);
      toast.success(t("project.history.employeeAssigned"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
    }
  };

  const handleUpdateAffectation = async (projectId: string, affectation: ProjectEmployee, nextRole: string) => {
    try {
      await affectationsApi.update(affectation.affectationId, {
        projetId: Number(projectId),
        employeId: affectation.id,
        roleDansProjet: nextRole,
      });
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((p) => p + 1);
      toast.success(t("save_success"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleRemoveAffectation = async (affectation: ProjectEmployee) => {
    try {
      await affectationsApi.remove(affectation.affectationId);
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((p) => p + 1);
      toast.success(t("delete_success") || t("common.delete"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
      throw err;
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    payload: { name: string; description: string; clientId: number; startDate: string; endDate: string; status: ProjectStatus }
  ) => {
    try {
      await projectsApi.update(Number(projectId), {
        nom: payload.name,
        description: payload.description,
        clientId: payload.clientId,
        dateDebut: payload.startDate,
        dateFinPrevue: payload.endDate || null,
        statut: payload.status,
      });
      Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
      setRefreshTrigger((p) => p + 1);
      toast.success(t("save_success"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
    }
  };

  const updateProjectStatusLocally = (projectId: string, status: ProjectStatus) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status } : p)));
    const cacheKey = "projects-all";
    const cached = userDataCache.current[cacheKey];
    if (Array.isArray(cached)) {
      userDataCache.current[cacheKey] = (cached as ProjectCard[]).map((p) =>
        p.id === projectId ? { ...p, status } : p
      );
    }
  };

  const openArchiveProjectModal = (project: ProjectCard) => {
    if (project.status !== "TERMINE") {
      toast.error("Archivage autorisé uniquement pour les projets TERMINÉS.");
      return;
    }
    setArchiveProjectState({ isOpen: true, project });
  };

  const handleArchiveProject = async (adminPassword?: string) => {
    if (!archiveProjectState.project || !adminPassword) return;
    const project = archiveProjectState.project;
    try {
      const updated = await projectsApi.archive(Number(project.id), adminPassword);
      updateProjectStatusLocally(project.id, (updated?.statut as ProjectStatus) || "ARCHIVE");
      setArchiveProjectState({ isOpen: false, project: null });
      toast.success(t("archive"));
    } catch (err) {
      throw err;
    }
  };

  const confirmRestoreProject = async (project: ProjectCard) => {
    try {
      const updated = await projectsApi.unarchive(Number(project.id));
      updateProjectStatusLocally(project.id, (updated?.statut as ProjectStatus) || "EN_COURS");
      toast.success(t("restore"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
    }
  };

  const openDeleteProjectModal = async (project: ProjectCard) => {
    try {
      const info = await projectsApi.deletionInfo(Number(project.id));
      setDeleteProjectState({
        isOpen: true,
        project,
        deletionInfo: info,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error")));
    }
  };

  const handleDeleteProjectPermanently = async (adminPassword?: string) => {
    if (!deleteProjectState.project || !deleteProjectState.deletionInfo) return;
    const requiresStrongFlow = deleteProjectState.deletionInfo.hasDeliverables;
    if (requiresStrongFlow && !adminPassword) return;

    const passwordToSend = requiresStrongFlow ? adminPassword! : "";
    await projectsApi.delete(Number(deleteProjectState.project.id), passwordToSend);
    Object.keys(userDataCache.current).forEach((k) => delete userDataCache.current[k]);
    setRefreshTrigger((p) => p + 1);
    setDeleteProjectState({ isOpen: false, project: null, deletionInfo: null });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto min-h-screen space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl tracking-tight text-stone-900 dark:text-white">{t("projects_management")}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {filteredProjects.length}{" "}
              {filteredProjects.length === 1 ? t("project_count_one") : t("project_count_other")} {t("found")}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 ikg-gradient-btn rounded-xl  transition-colors text-sm font-medium shadow-sm"
          type="button"
        >
          <Plus className="w-4 h-4" />
          {t("add_project")}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 max-w-4xl mx-auto"
      >
        <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400 group-focus-within:text-stone-700 dark:group-focus-within:text-white transition-colors" />
          </div>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("search_placeholder")}
            className="block w-full pl-12 pr-28 py-4 border border-stone-200 dark:border-stone-700 rounded-2xl bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 focus:border-stone-400 dark:focus:border-stone-600 text-base transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`relative h-9 px-3.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-md"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-700"
              }`}
              type="button"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{t("filter.apply")}</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-xl shadow-stone-100/60 dark:shadow-black/30 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("status")}</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "", label: t("filter.all") },
                        { value: "EN_COURS", label: t("status.EN_COURS") },
                        { value: "TERMINE", label: t("status.TERMINE") },
                        { value: "ARCHIVE", label: t("status.ARCHIVE") },
                      ].map((option) => (
                        <button
                          key={option.value || "all"}
                          type="button"
                          onClick={() => {
                            setFilters((p) => ({ ...p, status: option.value as any }));
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                            (filters.status || "") === option.value
                              ? "ikg-gradient-btn border-stone-900 dark:border-white"
                              : "bg-white dark:bg-stone-900/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("client")}</label>
                    <select
                      value={filters.client}
                      onChange={(e) => {
                        setFilters((p) => ({ ...p, client: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:outline-none focus:bg-white dark:focus:bg-stone-900 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="">{t("filter.all")}</option>
                      {availableClients.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("start_date")}</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => {
                        setFilters((p) => ({ ...p, startDate: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:outline-none focus:bg-white dark:focus:bg-stone-900 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-2 uppercase tracking-widest">{t("projects.plannedEnd")}</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => {
                        setFilters((p) => ({ ...p, endDate: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-900/20 dark:focus:ring-stone-100/20 focus:outline-none focus:bg-white dark:focus:bg-stone-900 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 mb-2">
                      <Filter className="w-3.5 h-3.5" />
                      {t("active_filters")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filters.status && (
                        <button
                          onClick={() => removeFilter("status")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          type="button"
                        >
                          {t(`status.${filters.status}`)} <X className="w-3 h-3" />
                        </button>
                      )}
                      {filters.client && (
                        <button
                          onClick={() => removeFilter("client")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          type="button"
                        >
                          {filters.client} <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("filter.reset")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader minHeightClassName="min-h-[400px]" variant="table" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50 overflow-hidden"
        >
          {paginatedProjects.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-stone-500 dark:text-stone-400">
              {t("no_projects_found")}
            </motion.div>
          ) : (
            <>
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-800/60">
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("project_name")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("client")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("status")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("start_date")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("projects.plannedEnd")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("employees")}</th>
                      <th className="text-left py-3.5 px-5 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {paginatedProjects.map((project, i) => {
                        const StatusIcon = getStatusIcon(project.status);
                        return (
                          <motion.tr
                            key={project.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            className="border-b border-stone-50 dark:border-stone-800/30 hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FolderKanban className="w-4 h-4 text-stone-400 shrink-0" />
                                <span className="text-sm font-medium text-stone-900 dark:text-white truncate">{project.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-sm text-stone-600 dark:text-stone-300">{project.client || "-"}</td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getProjectStatusBadge(project.status)}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {t(`status.${project.status}`)}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                              {project.startDate ? new Date(project.startDate).toLocaleDateString(getLocale()) : "-"}
                            </td>
                            <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                              {project.endDate ? new Date(project.endDate).toLocaleDateString(getLocale()) : "-"}
                            </td>
                            <td className="py-3.5 px-5 text-sm text-stone-500 dark:text-stone-400">
                              {project.assignedEmployees.length === 0 ? (
                                t("none")
                              ) : (
                                <div className="flex items-center">
                                  {project.assignedEmployees.slice(0, 4).map((emp, index) => (
                                    <button
                                      key={emp.affectationId}
                                      className={`w-7 h-7 rounded-full border-2 border-white dark:border-stone-900 overflow-hidden ${index > 0 ? "-ml-2" : ""} transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-stone-500`}
                                      title={`${emp.name} • ${emp.role}`}
                                      onClick={() =>
                                        setAffectationModalState({
                                          isOpen: true,
                                          projectId: project.id,
                                          affectation: emp,
                                        })
                                      }
                                      type="button"
                                    >
                                      <DefaultAvatar
                                        src={emp.avatar}
                                        alt={emp.name}
                                        size="xs"
                                        className="w-full h-full"
                                      />
                                    </button>
                                  ))}
                                  {project.assignedEmployees.length > 4 && (
                                    <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">+{project.assignedEmployees.length - 4}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex flex-wrap gap-1.5">
                                <button onClick={() => setAssignModalState({ isOpen: true, projectId: project.id })} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium ikg-gradient-btn rounded-lg transition-colors shadow-sm" type="button" title={t("assign")} aria-label={t("assign")}><Users className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditModalState({ isOpen: true, project })} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors" type="button" title={t("common.edit")} aria-label={t("common.edit")}><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => navigate(`/admin/projects/${project.id}`)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors" type="button" title={t("view")} aria-label={t("view")}><Eye className="w-3.5 h-3.5" /></button>
                                {project.status === "ARCHIVE" ? (
                                  <button onClick={() => confirmRestoreProject(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" type="button" title={t("restore")} aria-label={t("restore")}><RotateCcw className="w-3.5 h-3.5" /></button>
                                ) : (
                                  <button onClick={() => openArchiveProjectModal(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" type="button" title={t("archive")} aria-label={t("archive")}><Archive className="w-3.5 h-3.5" /></button>
                                )}
                                <button onClick={() => openDeleteProjectModal(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" type="button" title={t("delete_permanently")} aria-label={t("delete_permanently")}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              <div className="xl:hidden divide-y divide-stone-100 dark:divide-stone-800/40">
                <AnimatePresence initial={false}>
                  {paginatedProjects.map((project, i) => {
                    const StatusIcon = getStatusIcon(project.status);
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-white truncate">{project.name}</p>
                            <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{project.client}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shrink-0 ${getProjectStatusBadge(project.status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            {t(`status.${project.status}`)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-3">
                          <span>{t("start_date")}: {project.startDate ? new Date(project.startDate).toLocaleDateString(getLocale()) : "-"}</span>
                          <span>{t("projects.plannedEnd")}: {project.endDate ? new Date(project.endDate).toLocaleDateString(getLocale()) : "-"}</span>
                        </div>
                        {project.assignedEmployees.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {project.assignedEmployees.slice(0, 3).map((emp) => (
                              <button
                                key={emp.affectationId}
                                type="button"
                                onClick={() =>
                                  setAffectationModalState({
                                    isOpen: true,
                                    projectId: project.id,
                                    affectation: emp,
                                  })
                                }
                                className="px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700 text-[10px] text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/40"
                                title={`${emp.name} • ${emp.role}`}
                              >
                                {emp.name}
                              </button>
                            ))}
                            {project.assignedEmployees.length > 3 && (
                              <span className="px-2.5 py-1 text-[10px] text-stone-500 dark:text-stone-400">
                                +{project.assignedEmployees.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => setAssignModalState({ isOpen: true, projectId: project.id })} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium ikg-gradient-btn rounded-lg transition-colors shadow-sm" type="button" title={t("assign")} aria-label={t("assign")}><Users className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditModalState({ isOpen: true, project })} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors" type="button" title={t("common.edit")} aria-label={t("common.edit")}><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => navigate(`/admin/projects/${project.id}`)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors" type="button" title={t("view")} aria-label={t("view")}><Eye className="w-3.5 h-3.5" /></button>
                          {project.status === "ARCHIVE" ? (
                            <button onClick={() => confirmRestoreProject(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" type="button" title={t("restore")} aria-label={t("restore")}><RotateCcw className="w-3.5 h-3.5" /></button>
                          ) : (
                            <button onClick={() => openArchiveProjectModal(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" type="button" title={t("archive")} aria-label={t("archive")}><Archive className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => openDeleteProjectModal(project)} className="w-8 h-8 inline-flex items-center justify-center text-[11px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" type="button" title={t("delete_permanently")} aria-label={t("delete_permanently")}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/70 dark:border-stone-800/50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 dark:border-stone-700 disabled:opacity-50"
              type="button"
            >
              â€¹
            </button>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 dark:border-stone-700 disabled:opacity-50"
              type="button"
            >
              â€º
            </button>
          </div>
        </div>
      )}

      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProject={handleAddProject}
        clients={clients}
      />
      <EditProjectModal
        isOpen={editModalState.isOpen}
        onClose={() => setEditModalState({ isOpen: false, project: null })}
        onUpdateProject={handleUpdateProject}
        clients={clients}
        project={editModalState.project}
      />

      <AssignEmployeeModal
        isOpen={assignModalState.isOpen}
        onClose={() => setAssignModalState({ isOpen: false, projectId: null })}
        projectId={assignModalState.projectId || ""}
        onAssign={(employeeId, role) => {
          if (assignModalState.projectId) handleAssignEmployee(assignModalState.projectId, employeeId, role);
        }}
      />

      <ManageAffectationModal
        isOpen={affectationModalState.isOpen}
        onClose={() => setAffectationModalState({ isOpen: false, projectId: null, affectation: null })}
        employeeName={affectationModalState.affectation?.name ?? ""}
        employeeAvatar={affectationModalState.affectation?.avatar}
        initialRole={affectationModalState.affectation?.role ?? ""}
        onSave={async (role) => {
          if (!affectationModalState.projectId || !affectationModalState.affectation) return;
          await handleUpdateAffectation(affectationModalState.projectId, affectationModalState.affectation, role);
        }}
        onRemove={async () => {
          if (!affectationModalState.affectation) return;
          await handleRemoveAffectation(affectationModalState.affectation);
        }}
      />

      <SecureDeleteModal
        isOpen={archiveProjectState.isOpen}
        onClose={() => setArchiveProjectState({ isOpen: false, project: null })}
        title={`${t("archive")} • ${archiveProjectState.project?.name ?? ""}`}
        description="Double vérification + mot de passe administrateur requis."
        strongMode={true}
        confirmLabel={t("archive")}
        confirmButtonClassName="bg-stone-800 text-white hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600"
        checkTextA="Je confirme que ce projet est terminé."
        checkTextB="Je comprends que l'archivage limite les modifications."
        onConfirm={handleArchiveProject}
      />

      <SecureDeleteModal
        isOpen={deleteProjectState.isOpen}
        onClose={() => setDeleteProjectState({ isOpen: false, project: null, deletionInfo: null })}
        title={t("delete_permanently")}
        description={
          deleteProjectState.deletionInfo?.hasDeliverables
            ? t("delete_project_strong_warning", { count: deleteProjectState.deletionInfo.deliverablesCount })
            : t("delete_project_confirm")
        }
        strongMode={!!deleteProjectState.deletionInfo?.hasDeliverables}
        onConfirm={handleDeleteProjectPermanently}
      />
    </div>
  );
}