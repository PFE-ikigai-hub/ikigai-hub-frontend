export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ApiUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: "ADMIN" | "CLIENT" | "EMPLOYE";
  actif: boolean;
  organisation: string;
  telephone: string;
  dateCreation: string;
}

export interface ApiProject {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFinPrevue: string | null;
  statut: "EN_COURS" | "TERMINE" | "ARCHIVE" | "EN_ATTENTE" | "PLANIFIE";
  clientId: number;
  clientNom: string;
}

export interface ApiAffectation {
  id: number;
  projetId: number;
  employeId: number;
  employeNom: string;
  employePrenom: string;
  roleDansProjet: string;
  dateAffectation: string;
}

export interface ApiDeliverable {
  id: number;
  projetId: number;
  projetNom: string;
  nom: string;
  type: "IMAGE" | "VIDEO" | "TEXTE" | "PDF" | "AUDIO" | "AUTRE";
  description: string;
  statut: "EN_REVUE" | "VALIDE";
  dateCreation: string;
  deposeParNom: string;
  latestVersionId?: number | null;
  latestVersionNumero?: string | null;
}

export interface ApiVersion {
  id: number;
  livrableId: number;
  numero: string;
  dateUpload: string;
  uploadedAt?: string | null;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  fichierUrl: string;
  statut: "REVIEWED" | "VALIDATED";
}
