import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/core/auth/AuthProvider";

const {
  authApiMock,
  setApiRoleHeaderMock,
  setAppInitializingMock,
  readLastRoleMock,
  writeLastRoleMock,
} = vi.hoisted(() => ({
  authApiMock: {
    me: vi.fn(),
    refreshWithFallback: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  setApiRoleHeaderMock: vi.fn(),
  setAppInitializingMock: vi.fn(),
  readLastRoleMock: vi.fn(),
  writeLastRoleMock: vi.fn(),
}));

vi.mock("@/core/api/client", () => ({
  authApi: authApiMock,
  setApiRoleHeader: setApiRoleHeaderMock,
  setAppInitializing: setAppInitializingMock,
}));

vi.mock("@/core/auth/auth.storage", () => ({
  readLastRole: readLastRoleMock,
  writeLastRole: writeLastRoleMock,
}));

function AuthProbe() {
  const { user, role, isLoading, isFullyReady, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <pre data-testid="state">{JSON.stringify({ user, role, isLoading, isFullyReady, isAuthenticated })}</pre>
      <button onClick={() => void login("admin@ikigai.com", "secret")} type="button">
        login
      </button>
      <button onClick={() => void logout()} type="button">
        logout
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId("state").textContent || "{}") as {
    user: { id: string; role: string } | null;
    role: string | null;
    isLoading: boolean;
    isFullyReady: boolean;
    isAuthenticated: boolean;
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readLastRoleMock.mockReturnValue(null);
    authApiMock.me.mockResolvedValue({
      id: 1,
      email: "admin@ikigai.com",
      nom: "Admin",
      prenom: "Root",
      role: "ADMIN",
    });
    authApiMock.refreshWithFallback.mockResolvedValue({
      token: null,
      email: "client@ikigai.com",
      role: "CLIENT",
      userId: 2,
      nom: "Client",
      prenom: "User",
    });
    authApiMock.login.mockResolvedValue({
      token: null,
      email: "admin@ikigai.com",
      role: "ADMIN",
      userId: 1,
      nom: "Admin",
      prenom: "Root",
    });
    authApiMock.logout.mockResolvedValue(undefined);
  });

  it("hydrates authenticated state from /me", async () => {
    renderProvider();

    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    const state = readState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe("ADMIN");
    expect(setAppInitializingMock).toHaveBeenCalledWith(true);
    expect(setAppInitializingMock).toHaveBeenLastCalledWith(false);
    expect(setApiRoleHeaderMock).toHaveBeenCalledWith("ADMIN");
    expect(writeLastRoleMock).toHaveBeenCalledWith("ADMIN");
  });

  it("falls back to refresh flow when /me fails", async () => {
    readLastRoleMock.mockReturnValue("CLIENT");
    authApiMock.me
      .mockRejectedValueOnce(new Error("expired"))
      .mockResolvedValueOnce({
        id: 2,
        email: "client@ikigai.com",
        nom: "Client",
        prenom: "User",
        role: "CLIENT",
      });

    renderProvider();

    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    const state = readState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe("CLIENT");
    expect(authApiMock.refreshWithFallback).toHaveBeenCalledWith("CLIENT");
  });

  it("applies signed-out state when init fails with non-network error", async () => {
    authApiMock.me.mockRejectedValueOnce(new Error("expired"));
    authApiMock.refreshWithFallback.mockRejectedValueOnce({ response: { status: 401 } });

    renderProvider();

    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    const state = readState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isFullyReady).toBe(true);
    expect(setApiRoleHeaderMock).toHaveBeenCalledWith(null);
  });

  it("login updates user state and stores post-login splash key", async () => {
    renderProvider();
    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(authApiMock.login).toHaveBeenCalledWith("admin@ikigai.com", "secret");
    });

    expect(sessionStorage.getItem("ikigai:postLoginSplash")).toBe("1");
    expect(setApiRoleHeaderMock).toHaveBeenCalledWith("ADMIN");
    expect(writeLastRoleMock).toHaveBeenCalledWith("ADMIN");
  });

  it("logout clears auth local state", async () => {
    sessionStorage.setItem("ikigai:justLoggedIn", "1");
    localStorage.setItem("ikigai:bootSplashSeen", "1");
    localStorage.setItem("ikigai:history:project:17", "old");

    renderProvider();
    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(readState().isAuthenticated).toBe(false);
    });

    expect(authApiMock.logout).toHaveBeenCalledTimes(1);
    expect(setApiRoleHeaderMock).toHaveBeenCalledWith(null);
    expect(writeLastRoleMock).toHaveBeenCalledWith(null);
  });

  it("reacts to auth:logout event", async () => {
    renderProvider();
    await waitFor(() => {
      expect(readState().isLoading).toBe(false);
    });

    window.dispatchEvent(new Event("auth:logout"));

    await waitFor(() => {
      expect(authApiMock.logout).toHaveBeenCalled();
    });
  });
});
