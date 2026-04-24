const LOGOUT_WAIT_TIMEOUT_MS = 1500;

export function normalizeRole(value: string | null | undefined) {
  const upper = value?.toString().toUpperCase();
  return upper === "EMPLOYEE" ? "EMPLOYE" : upper;
}

export function parseExpectedUserId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCurrentUserId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// Verifie si le lien doit forcer une reconnexion.
export function hasIdentityMismatch(params: URLSearchParams, role: string | null | undefined, userId: string | undefined) {
  const expectedRole = normalizeRole(params.get("expectedRole"));
  const expectedUserId = parseExpectedUserId(params.get("expectedUserId"));
  const normalizedRole = normalizeRole(role);
  const currentUserId = parseCurrentUserId(userId);

  const roleMismatch = Boolean(expectedRole && normalizedRole && expectedRole !== normalizedRole);
  const userMismatch =
    typeof expectedUserId === "number" &&
    typeof currentUserId === "number" &&
    expectedUserId !== currentUserId;

  return { roleMismatch, userMismatch, normalizedRole };
}

export function setWrongAccountNotice() {
  try {
    sessionStorage.setItem(
      "ikigai:authNotice",
      "This link requires login with the correct account. You will be redirected to sign in."
    );
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Deconnecte proprement sans bloquer la navigation.
export async function forceRelogin(logout: () => Promise<void>, goToLogin: () => void) {
  setWrongAccountNotice();
  const logoutTask = Promise.race([logout(), sleep(LOGOUT_WAIT_TIMEOUT_MS)]);
  void logoutTask.finally(() => {
    goToLogin();
  });
  try {
    await logoutTask;
  } catch {
    // ignore
  }
  goToLogin();
}

