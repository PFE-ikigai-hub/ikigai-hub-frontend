export type UserRole = "ADMIN" | "CLIENT" | "EMPLOYE";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  photoUrl?: string | null;
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
