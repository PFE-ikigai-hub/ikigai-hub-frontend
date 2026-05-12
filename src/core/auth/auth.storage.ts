import type { UserRole } from "@/types/auth";


const STORAGE_KEY = "ikigai:lastRole";

export function readLastRole(): UserRole | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "ADMIN" || raw === "CLIENT" || raw === "EMPLOYE") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeLastRole(role: UserRole | null) {
  try {
    if (!role) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
  }
}
