import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { RequireAuth, RequireRole } from "@/app/router/guards";
import { useAuth } from "@/core/auth/AuthProvider";

vi.mock("@/core/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("router guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when unauthenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: false,
      isFullyReady: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>Private Area</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Private Area")).not.toBeInTheDocument();
  });

  it("renders protected content when authenticated", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", firstName: "A", lastName: "B", email: "a@b.com", role: "ADMIN" },
      role: "ADMIN",
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>Private Area</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Private Area")).toBeInTheDocument();
  });

  it("redirects to role dashboard when role is not allowed", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", firstName: "Client", lastName: "X", email: "c@x.com", role: "CLIENT" },
      role: "CLIENT",
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <RequireRole role="ADMIN">
                <div>Admin Content</div>
              </RequireRole>
            }
          />
          <Route path="/client/dashboard" element={<div>Client Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Client Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
