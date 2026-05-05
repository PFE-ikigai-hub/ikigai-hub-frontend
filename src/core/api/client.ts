// Ce fichier gere une partie du frontend.
import axios from "axios";
import type {

  ApiAffectation,
  ApiAnnotation,
  ApiCommentaire,
  ApiCreateAnnotationRequest,
  ApiCreateCommentaireRequest,
  ApiDeliverable,
  ApiNotification,
  ApiPage,
  ApiProject,
  ApiProjectHistoryEvent,
  ApiUser,
  ApiVersion,
  AuthResponse,
  CurrentUserResponse,
  DeliverableType,
  UserRole,
} from "@/types/index";

const ALL_ROLES: UserRole[] = ["ADMIN", "CLIENT", "EMPLOYE"];
const API_BASE_URL_STORAGE_KEY = "ikigai:apiBaseUrl";

// Cette fonction nettoie l'URL de base avant usage.
function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

// Cette fonction lit l'URL API sauvegardee dans le navigateur.
function readStoredApiBaseUrl(): string | null {
  try {
    const raw = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) return null;
    return normalizeApiBaseUrl(raw);
  } catch {
    return null;
  }
}

// Cette fonction enregistre ou efface l'URL API personnalisee.
function writeStoredApiBaseUrl(url: string | null) {
  try {
    if (!url) {
      window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizeApiBaseUrl(url));
  } catch {
  }
}

// Cette valeur choisit l'URL API depuis l'environnement ou le stockage local.
const API_BASE_URL =
  normalizeApiBaseUrl((import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || "") ||
  readStoredApiBaseUrl() ||
  "";

// Cette instance Axios centralise la configuration HTTP commune.
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000
});

// Cette fonction transforme plusieurs formats de reponse en tableau simple.
function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.content)) return record.content as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.results)) return record.results as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
}

// Cette fonction transforme plusieurs formats de reponse en pagination standard.
function toPage<T>(payload: unknown): ApiPage<T> {
  if (payload && typeof payload === "object" && Array.isArray((payload as { content?: unknown }).content)) {
    return payload as ApiPage<T>;
  }
  const content = toArray<T>(payload);
  return {
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    number: 0,
    size: content.length,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

let roleHeader: UserRole | null = null;
let appInitializing = true;
let logoutFired = false;
let refreshInFlight: Promise<AuthResponse> | null = null;
let refreshBlockedUntil = 0;

// Cette fonction met a jour le role ajoute dans les headers.
export const setApiRoleHeader = (role: UserRole | null) => {
  roleHeader = role;
};

// Cette fonction retourne l'URL API actuellement utilisee.
export const getApiBaseUrl = () => String(api.defaults.baseURL ?? "");

// Cette fonction change l'URL API a chaud dans le frontend.
export const setApiBaseUrl = (url: string | null) => {
  if (!url) {
    const derived =
      normalizeApiBaseUrl((import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || "") ||
      "";
    api.defaults.baseURL = derived;
    writeStoredApiBaseUrl(null);
    return;
  }
  const normalized = normalizeApiBaseUrl(url);
  api.defaults.baseURL = normalized;
  writeStoredApiBaseUrl(normalized);
};

// Cette fonction indique si l'application est encore en initialisation.
export const setAppInitializing = (value: boolean) => {
  appInitializing = value;
};

// Cette fonction detecte les erreurs reseau temporaires.
function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const axiosErr = error as { response?: unknown; code?: string };
  if (!axiosErr.response) return true;
  return axiosErr.code === "ECONNABORTED";
}

// Cet intercepteur ajoute automatiquement le role courant si besoin.
api.interceptors.request.use((config) => {
  if (roleHeader && !config.headers?.["X-Frontend-Role"]) {
    config.headers["X-Frontend-Role"] = roleHeader;
  }
  return config;
});

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Cet intercepteur gere le refresh de session et les retries reseau.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const url = String(config?.url ?? "");
    if (
      status === 401 &&
      config &&
      !config._retry &&
      !url.includes("/api/auth/login") &&
      !url.includes("/api/auth/refresh") &&
      !appInitializing
    ) {
      config._retry = true;
      try {
        const refreshed = await authApi.refreshWithFallback(roleHeader);
        setApiRoleHeader(refreshed.role);
        return api(config);
      } catch (refreshError) {
        if (!logoutFired && !appInitializing) {
          logoutFired = true;
          window.dispatchEvent(new CustomEvent("auth:logout"));
          setTimeout(() => {
            logoutFired = false;
          }, 6000);
        }
        return Promise.reject(refreshError);
      }
    }
    const isRetryableStatus = status === 404 || status === 408 || status === 429 || (status >= 500 && status <= 504);
    const canRetry = config && config.method?.toLowerCase() === "get" && (isRetryableStatus || !error.response);

    if (canRetry) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * config._retryCount));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

// Ce bloc regroupe les appels lies a l'authentification.
export const authApi = {
  login: async (email: string, motDePasse: string) => {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, motDePasse }, { timeout: 12000 });
    return data;
  },
  register: async (payload: {
    email: string;
    motDePasse: string;
    nom: string;
    prenom: string;
    role: UserRole;
    organisation?: string;
  }) => {
    const { data } = await api.post<AuthResponse>("/api/auth/register", payload);
    return data;
  },
  refreshForRole: async (role: UserRole) => {
    const { data } = await api.post<AuthResponse>(
      "/api/auth/refresh",
      {},
      { headers: { "X-Frontend-Role": role }, timeout: 6000 }
    );
    return data;
  },
  refreshWithFallback: async (preferredRole?: UserRole | null) => {
    const now = Date.now();
    if (now < refreshBlockedUntil) {
      throw new Error("refresh_temporarily_blocked");
    }

    if (refreshInFlight) {
      return refreshInFlight;
    }

    const run = async (): Promise<AuthResponse> => {
    const order: UserRole[] = [];
    const pushRole = (role?: UserRole | null) => {
      if (!role) return;
      if (!order.includes(role)) order.push(role);
    };

    pushRole(preferredRole);
    pushRole(roleHeader);
    ALL_ROLES.forEach(pushRole);

    let lastError: unknown;
    for (const role of order) {
      try {
        const data = await authApi.refreshForRole(role);
        return data;
      } catch (e) {
        if (isNetworkError(e)) {
          refreshBlockedUntil = Date.now() + 5000;
          throw e;
        }
        lastError = e;
      }
    }

    try {
      const { data } = await api.post<AuthResponse>("/api/auth/refresh", {}, { timeout: 6000 });
      return data;
    } catch (e) {
      if (isNetworkError(e)) {
        refreshBlockedUntil = Date.now() + 5000;
      }
      throw lastError ?? e;
    }
    };

    refreshInFlight = run();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },
  refresh: async () => authApi.refreshWithFallback(roleHeader),
  me: async () => {
    const { data } = await api.get<CurrentUserResponse>("/api/users/me", { timeout: 6000 });
    return data;
  },
  forgotPassword: async (email: string) => {
    const { data } = await api.post("/api/auth/forgot-password", { email });
    return data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const { data } = await api.post("/api/auth/reset-password", { token, newPassword });
    return data;
  },
  logout: async () => {
    await Promise.allSettled(
      ALL_ROLES.map((role) =>
        api.post(
          "/api/auth/logout",
          {},
          {
            headers: { "X-Frontend-Role": role },
          }
        )
      )
    );
  },
};

// Ce bloc regroupe les appels lies aux utilisateurs.
export const usersApi = {
  list: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<ApiPage<ApiUser>>("/api/users", { params });
    return data;
  },
  activate: async (id: number) => {
    await api.patch(`/api/users/${id}/activate`);
  },
  deactivate: async (id: number) => {
    await api.patch(`/api/users/${id}/deactivate`);
  },
  deletePermanent: async (id: number, adminPassword: string) => {
    await api.delete(`/api/users/${id}`, { data: { adminPassword } });
  },
  updateProfile: async (profileData: { nom?: string; prenom?: string; telephone?: string; organisation?: string }) => {
    const { data } = await api.put<ApiUser>("/api/users/me", profileData);
    return data;
  },
};

// Ce bloc regroupe les appels lies aux projets.
export const projectsApi = {
  list: async (params?: Record<string, unknown>) => {
    const { data } = await api.get("/api/projets", { params });
    return toPage<ApiProject>(data);
  },
  batch: async (ids: number[]) => {
    const { data } = await api.get("/api/projets/batch", { params: { ids: ids.join(",") } });
    return toArray<ApiProject>(data);
  },
  byId: async (id: number) => {
    const { data } = await api.get<ApiProject>(`/api/projets/${id}`);
    return data;
  },
  create: async (payload: Partial<ApiProject> & { clientId: number; nom: string }) => {
    const { data } = await api.post<ApiProject>("/api/projets", payload);
    return data;
  },
  update: async (
    id: number,
    payload: {
      nom: string;
      clientId: number;
      description?: string;
      dateDebut?: string;
      dateFinPrevue?: string | null;
      statut?: string;
    }
  ) => {
    const { data } = await api.put<ApiProject>(`/api/projets/${id}`, payload);
    return data;
  },
  archive: async (id: number, adminPassword: string) => {
    const { data } = await api.put<ApiProject>(`/api/projets/${id}/archive`, { adminPassword });
    return data;
  },
  unarchive: async (id: number) => {
    const { data } = await api.put<ApiProject>(`/api/projets/${id}/unarchive`);
    return data;
  },
  deletionInfo: async (id: number): Promise<{ hasDeliverables: boolean; deliverablesCount: number }> => {
    const { data } = await api.get<{ hasDeliverables: boolean; deliverablesCount: number }>(
      `/api/projets/${id}/deletion-info`
    );
    return data;
  },
  history: async (id: number): Promise<ApiProjectHistoryEvent[]> => {
    const { data } = await api.get<ApiProjectHistoryEvent[]>(`/api/projets/${id}/history`);
    return Array.isArray(data) ? data : [];
  },
  delete: async (id: number, adminPassword: string): Promise<{ hasDeliverables: boolean; deliverablesCount: number }> => {
    const { data } = await api.delete<{ hasDeliverables: boolean; deliverablesCount: number }>(`/api/projets/${id}`, {
      data: { adminPassword },
    });
    return data;
  },
};

// Ce bloc regroupe les appels lies aux affectations.
export const affectationsApi = {
  byProject: async (projectId: number) => {
    const { data } = await api.get(`/api/affectations/projet/${projectId}`, { params: { size: 100 } });
    return toPage<ApiAffectation>(data);
  },
  batchByProjects: async (projectIds: number[]) => {
    const { data } = await api.get("/api/affectations/batch", { params: { ids: projectIds.join(",") } });
    return toArray<ApiAffectation>(data);
  },
  byEmployee: async (employeeId: number) => {
    const { data } = await api.get(`/api/affectations/employe/${employeeId}`, { params: { size: 100 } });
    return toPage<ApiAffectation>(data);
  },
  create: async (payload: { projetId: number; employeId: number; roleDansProjet?: string }) => {
    const { data } = await api.post<ApiAffectation>("/api/affectations", payload);
    return data;
  },
  update: async (affectationId: number, payload: { projetId: number; employeId: number; roleDansProjet?: string }) => {
    const { data } = await api.put<ApiAffectation>(`/api/affectations/${affectationId}`, payload);
    return data;
  },
  remove: async (affectationId: number) => {
    await api.delete(`/api/affectations/${affectationId}`);
  },
};

export type DownloadConfirmationPayload = {
  password: string;
  confirmA: boolean;
  confirmB: boolean;
};

// Ce bloc regroupe les appels lies aux livrables.
export const deliverablesApi = {
  list: async (params?: Record<string, unknown>) => {
    const { data } = await api.get("/api/livrables", { params });
    return toPage<ApiDeliverable>(data);
  },
  batchByProjects: async (projectIds: number[]) => {
    const { data } = await api.get("/api/livrables/batch", { params: { ids: projectIds.join(",") } });
    return toArray<ApiDeliverable>(data);
  },
  byProject: async (projectId: number) => {
    const { data } = await api.get(`/api/livrables/projet/${projectId}`, { params: { size: 100 } });
    return toPage<ApiDeliverable>(data);
  },
  byId: async (id: number) => {
    const { data } = await api.get<ApiDeliverable>(`/api/livrables/${id}`);
    return data;
  },
  create: async (payload: { projetId: number; nom: string; type: DeliverableType; description?: string }) => {
    const { data } = await api.post<ApiDeliverable>("/api/livrables", payload);
    return data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/livrables/${id}`);
  },
  download: async (deliverableId: number, payload: DownloadConfirmationPayload): Promise<Blob> => {
    const response = await api.post(
      `/api/livrables/${deliverableId}/download`,
      payload,
      { responseType: "blob" }
    );
    return response.data;
  },
};

const VERSION_API_BASE = "/api/versions";

// Cette fonction construit une URL relative pour le module des versions.
function getVersionUrl(suffix: string): string {
  return `${VERSION_API_BASE}${suffix}`;
}

// Cette fonction factorise les requetes GET sur les versions.
async function versionGet<T>(suffix: string, config?: Parameters<typeof api.get>[1]) {
  return await api.get<T>(getVersionUrl(suffix), config);
}

// Cette fonction factorise les requetes POST sur les versions.
async function versionPost<T>(suffix: string, data?: unknown, config?: Parameters<typeof api.post>[2]) {
  return await api.post<T>(getVersionUrl(suffix), data, config);
}

// Cette fonction factorise les requetes PATCH sur les versions.
async function versionPatch<T>(suffix: string, data?: unknown, config?: Parameters<typeof api.patch>[2]) {
  return await api.patch<T>(getVersionUrl(suffix), data, config);
}

// Cette fonction factorise les requetes DELETE sur les versions.
async function versionDelete(suffix: string, config?: Parameters<typeof api.delete>[1]) {
  return await api.delete(getVersionUrl(suffix), config);
}

// Ce bloc regroupe les appels lies aux versions.
export const versionsApi = {
  byDeliverable: async (deliverableId: number) => {
    const { data } = await versionGet(`/livrable/${deliverableId}`, { params: { size: 100 } });
    return toPage<ApiVersion>(data);
  },
  batchByDeliverables: async (deliverableIds: number[]) => {
    if (!deliverableIds.length) return [];
    const { data } = await versionGet("/batch", { params: { ids: deliverableIds.join(",") } });
    return toArray<ApiVersion>(data);
  },
  getById: async (versionId: number) => {
    const { data } = await versionGet<ApiVersion>(`/${versionId}`);
    return data;
  },
  updateNoteInterne: async (versionId: number, noteInterne: string | null) => {
    const { data } = await versionPatch<ApiVersion>(`/${versionId}/note-interne`, { noteInterne });
    return data;
  },
  validate: async (versionId: number) => {
    const { data } = await versionPost<ApiVersion>(`/${versionId}/valider`);
    return data;
  },
  upload: async (deliverableId: number, file: File, noteInterne?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (noteInterne) form.append("noteInterne", noteInterne);

    const headersInit: HeadersInit = {};
    if (roleHeader) {
      headersInit["X-Frontend-Role"] = roleHeader;
    }

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        const runtimeBaseUrl = getApiBaseUrl();
        const response = await fetch(`${runtimeBaseUrl}${VERSION_API_BASE}/upload/${deliverableId}`, {
          method: "POST",
          body: form,
          credentials: "include",
          headers: headersInit,
        });

        if (response.ok) {
          return response.json();
        }

        const isTransient = response.status === 408 || response.status === 429 || (response.status >= 502 && response.status <= 504);
        if (isTransient && retries < MAX_RETRIES) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retries));
          continue;
        }

        const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      } catch (err: any) {
        if (retries < MAX_RETRIES && (isNetworkError(err) || err.message?.includes("NetworkError"))) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retries));
          continue;
        }
        throw err;
      }
    }
  },
  delete: async (versionId: number) => {
    await versionDelete(`/${versionId}`);
  },
  download: async (versionId: number, payload: DownloadConfirmationPayload): Promise<Blob> => {
    const response = await versionPost<Blob>(
      `/${versionId}/download`,
      payload,
      { responseType: "blob" }
    );
    return response.data;
  },
  preview: async (versionId: number): Promise<{ url: string; contentType: string; blob: Blob }> => {
    const response = await versionGet(`/${versionId}/preview`, {
      responseType: "blob",
    });
    const contentType = (response.headers["content-type"] || "").toLowerCase();
    if (contentType.includes("text/html")) {
      throw new Error("Invalid preview content type (HTML detected)");
    }

    const blob = new Blob([response.data as any], { type: contentType });
    return {
      url: window.URL.createObjectURL(blob),
      contentType,
      blob,
    };
  },
};

// Ce bloc regroupe les appels lies aux commentaires.
export const commentsApi = {
  byVersion: async (versionId: number) => {
    const { data } = await versionGet(`/${versionId}/commentaires`);
    return toArray<ApiCommentaire>(data);
  },
  create: async (versionId: number, texte: string) => {
    const payload: ApiCreateCommentaireRequest = { versionId, texte };
    const { data } = await versionPost<ApiCommentaire>("/commentaires", payload);
    return data;
  },
  delete: async (commentId: number) => {
    await versionDelete(`/commentaires/${commentId}`);
  },
};

// Ce bloc regroupe les appels lies aux annotations.
export const annotationsApi = {
  byVersion: async (versionId: number) => {
    const { data } = await versionGet(`/${versionId}/annotations`);
    return toArray<ApiAnnotation>(data);
  },
  create: async (payload: ApiCreateAnnotationRequest) => {
    const { data } = await versionPost<ApiAnnotation>("/annotations", payload);
    return data;
  },
  delete: async (annotationId: number) => {
    await versionDelete(`/annotations/${annotationId}`);
  },
};

// Ce bloc regroupe les appels lies a la traduction.
export const translationApi = {
  translate: async (text: string, target: string) => {
    const { data } = await api.post<{ translatedText: string }>("/api/translate", { text, target });
    return data?.translatedText ?? "";
  },
};

// Ce bloc regroupe les appels lies aux notifications.
export const notificationsApi = {
  list: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<ApiPage<ApiNotification>>("/api/notifications", { params });
    return data;
  },
  unreadCount: async () => {
    const { data } = await api.get<{ count: number }>("/api/notifications/unread-count");
    return typeof data?.count === "number" ? data.count : 0;
  },
  markAsRead: async (id: number) => {
    const { data } = await api.patch<ApiNotification>(`/api/notifications/${id}/read`);
    return data;
  },
  markAllAsRead: async () => {
    const { data } = await api.patch<{ updated: number }>("/api/notifications/read-all");
    return typeof data?.updated === "number" ? data.updated : 0;
  },
  delete: async (id: number) => {
    await api.delete(`/api/notifications/${id}`);
  },
};

// Cette fonction lance un telechargement dans le navigateur.
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Cette fonction devine le type MIME depuis le nom de fichier.
export function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] || "application/octet-stream";
}

// Cette fonction extrait le nom du fichier depuis le header HTTP.
export function extractFilename(contentDisposition: string | undefined): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1].trim());
  const basicMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
  if (basicMatch) return basicMatch[1].trim();
  return null;
}
