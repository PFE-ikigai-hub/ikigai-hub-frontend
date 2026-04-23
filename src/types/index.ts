// Unified TypeScript Types for Ikigai Dashboard
// Mirroring backend DTOs (Spring Boot)

// ═══════════════════════════════════════════════════════════════════════════════
//  USER & AUTH
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = "ADMIN" | "EMPLOYE" | "CLIENT";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  photoUrl?: string | null;
  organisation?: string;
  telephone?: string;
  actif?: boolean;
}

export interface AuthResponse {
  token: string | null;
  email: string;
  role: UserRole;
  userId: number;
  nom: string;
  prenom: string;
}

export interface CurrentUserResponse {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  photoUrl?: string | null;
}

export interface ApiUpdateUserProfileRequest {
  nom?: string;
  prenom?: string;
  telephone?: string;
  organisation?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  actif: boolean;
  organisation: string;
  telephone: string;
  derniereConnexion: string | null;
  dateCreation: string;
  photoUrl?: string | null;
}

export type UserStatus = "actif" | "inactif";

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface NewUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  company: string;
  status: UserStatus;
  password?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ProjectStatus =
  | "EN_COURS"
  | "TERMINE"
  | "ARCHIVE"
  | "EN_ATTENTE"
  | "PLANIFIE";

export type ApiProjetStatut = ProjectStatus;

export interface ApiProject {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFinPrevue: string | null;
  statut: ProjectStatus;
  clientId: number;
  clientNom: string;
}

export interface ApiProjectHistoryEvent {
  id: number;
  role: string;
  name: string;
  message: string;
  createdAt: string;
}

export interface ApiCreateProjetRequest {
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFinPrevue?: string;
  clientId: number;
  statut?: string;
}

export interface AvailableClient {
  id: number;
  name: string;
  email: string;
}

export interface NewProjectData {
  name: string;
  description: string;
  client: string;
  clientId?: number;
  startDate: string;
  endDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AFFECTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiAffectation {
  id: number;
  projetId: number;
  projetNom: string;
  employeId: number;
  employeNom: string;
  employePrenom: string;
  roleDansProjet: string;
  dateAffectation: string;
}

export interface ApiCreateAffectationRequest {
  projetId: number;
  employeId: number;
  roleDansProjet?: string;
}

export interface ProjectEmployee {
  id?: string;
  name: string;
  role: string;
  email?: string;
  affectationId?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DELIVERABLES
// ═══════════════════════════════════════════════════════════════════════════════

export type DeliverableStatus = "EN_REVUE" | "VALIDE";
export type DeliverableType = "IMAGE" | "VIDEO" | "TEXTE" | "PDF" | "AUDIO" | "AUTRE";

export type ApiLivrableStatut = DeliverableStatus;
export type ApiLivrableType = DeliverableType;

export interface ApiDeliverable {
  id: number;
  projetId: number;
  projetNom: string;
  nom: string;
  type: DeliverableType;
  description: string;
  statut: DeliverableStatus;
  dateCreation: string;
  deposeParId: number;
  deposeParNom: string;
  latestVersionId?: number | null;
  latestVersionNumero?: string | null;
  versions?: ApiVersion[];
}

export interface ApiCreateLivrableRequest {
  projetId: number;
  nom?: string;
  type: DeliverableType;
  description?: string;
}

export interface Deliverable {
  id: string;
  name: string;
  project: string;
  projectId: string;
  type: string;
  uploadDate: string;
  status: DeliverableStatus;
  thumbnailUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VERSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type VersionStatus = "REVIEWED" | "VALIDATED";
export type ApiVersionStatut = VersionStatus;

export interface ApiVersion {
  id: number;
  livrableId: number;
  livrableNom: string;
  numero: string;
  fichierUrl: string;
  dateUpload: string;
  uploadedAt?: string | null;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  noteInterne: string | null;
  statut: VersionStatus;
  commentaires: ApiCommentaire[];
  annotations: ApiAnnotation[];
  validations: ApiValidation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiCommentaire {
  id: number;
  versionId: number;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurPhotoUrl?: string | null;
  texte: string;
  date: string;
}

export interface ApiCreateCommentaireRequest {
  versionId: number;
  texte: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANNOTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiAnnotation {
  id: number;
  versionId: number;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  positionJson: Record<string, unknown>;
  rayonJson: Record<string, unknown>;
  date: string;
}

export interface ApiCreateAnnotationRequest {
  versionId: number;
  positionJson: Record<string, unknown>;
  rayonJson: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VALIDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiValidation {
  id: number;
  versionId: number;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  dateValidation: string;
}

export type NotificationType =
  | "PROJECT_CREATED"
  | "PROJECT_ASSIGNED"
  | "LIVRABLE_CREATED"
  | "VERSION_UPLOADED"
  | "COMMENT_ADDED"
  | "ANNOTATION_ADDED"
  | "VERSION_VALIDATED"
  | "PROJECT_ARCHIVED"
  | "PROJECT_UNARCHIVED";

export interface ApiNotification {
  id: number;
  type: NotificationType;
  titre: string;
  message: string;
  routePath?: string | null;
  dataJson?: Record<string, unknown> | null;
  lu: boolean;
  createdAt: string;
  readAt?: string | null;
  acteurId?: number | null;
  projetId?: number | null;
  livrableId?: number | null;
  versionId?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THEME & I18N
// ═══════════════════════════════════════════════════════════════════════════════

export type Theme = "light" | "dark";
export type Language = "FR" | "EN" | "AR";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}
