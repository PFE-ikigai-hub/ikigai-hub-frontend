import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "@/modules/auth/LoginPage";
import { useAuth } from "@/core/auth/AuthProvider";
import { authApi } from "@/core/api/client";


const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/core/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/core/api/client", () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
}));

vi.mock("@/core/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "login.fillAllFields": "Veuillez remplir tous les champs",
          "login.error": "Identifiants incorrects",
          "login.signingIn": "Connexion...",
          "login.signIn": "Se connecter",
          "login.forgotPassword": "Mot de passe oublié ?",
          "login.forgotPasswordTitle": "Récupérer mon accès",
          "login.forgotPasswordDesc": "Entrez votre email",
          "login.sendResetLink": "Envoyer le lien",
          "login.resetSuccess": "Lien envoyé ! Vérifiez votre boîte mail.",
          "login.resetSuccessDesc": "Vérifiez votre email",
          "login.backToLogin": "Retour à la connexion",
          "login.welcomeTo": "Bienvenue sur",
          "login.needAccess": "Besoin d'accès ?",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock("@/shared/components/effects/Prism", () => ({
  default: () => null,
}));

vi.mock("@/shared/components/effects/BorderGlow", () => ({
  default: ({ children }: { children: any }) => <>{children}</>,
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedForgotPassword = vi.mocked(authApi.forgotPassword);

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("renders login form", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mot de passe oublié ?" })).toBeInTheDocument();
  });

  it("shows required fields error on empty submit", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(await screen.findByText("Veuillez remplir tous les champs")).toBeInTheDocument();
  });

  it("calls login on success", async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: false,
      login: loginMock,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/votre\.email@exemple\.com/i), {
      target: { value: "employee@ikigai.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]') as HTMLInputElement, {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("employee@ikigai.com", "password123");
    });
  });

  it("shows backend login error message", async () => {
    const loginMock = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: "Bad credentials" } },
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: false,
      login: loginMock,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/votre\.email@exemple\.com/i), {
      target: { value: "employee@ikigai.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]') as HTMLInputElement, {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Bad credentials")).toBeInTheDocument();
  });

  it("handles forgot password flow", async () => {
    mockedForgotPassword.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /mot de passe oubli/i }));
    expect(await screen.findByRole("button", { name: /envoyer/i })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/votre\.email@exemple\.com/i), {
      target: { value: "client@ikigai.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() => {
      expect(mockedForgotPassword).toHaveBeenCalledWith("client@ikigai.com");
    });
    expect(await screen.findByText("Lien envoyé ! Vérifiez votre boîte mail.")).toBeInTheDocument();
  });

  it("navigates to redirect route after role becomes available", async () => {
    window.history.pushState({}, "", "/login?redirect=/client/dashboard");

    mockedUseAuth.mockReturnValue({
      user: { id: "1", firstName: "Admin", lastName: "A", email: "admin@ikigai.com", role: "ADMIN" },
      role: "ADMIN",
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/client/dashboard", { replace: true });
    });
  });
});
