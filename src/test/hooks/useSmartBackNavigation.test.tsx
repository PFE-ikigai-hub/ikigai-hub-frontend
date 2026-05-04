import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSmartBackNavigation } from "@/shared/hooks/useSmartBackNavigation";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function Probe({
  role,
  state,
}: {
  role: "ADMIN" | "CLIENT" | "EMPLOYE" | null;
  state?: { fromEmailDeepLink?: boolean };
}) {
  const { goBack, canUseHistoryBack, fallbackPath } = useSmartBackNavigation({ role });
  return (
    <div>
      <button onClick={goBack} type="button">
        go-back
      </button>
      <span data-testid="can-use-history">{String(canUseHistoryBack)}</span>
      <span data-testid="fallback-path">{fallbackPath}</span>
      <span data-testid="state">{JSON.stringify(state ?? null)}</span>
    </div>
  );
}

describe("useSmartBackNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({ idx: 0 }, "", "/");
    Object.defineProperty(document, "referrer", { configurable: true, value: "" });
  });

  it("falls back to role default when history back is not safe", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/employee/projects", state: null }]}>
        <Probe role="EMPLOYE" />
      </MemoryRouter>
    );

    expect(screen.getByTestId("can-use-history").textContent).toBe("false");
    expect(screen.getByTestId("fallback-path").textContent).toBe("/employee/feedback");

    fireEvent.click(screen.getByRole("button", { name: "go-back" }));
    expect(navigateMock).toHaveBeenCalledWith("/employee/feedback", { replace: true });
  });

  it("uses browser history when safe", () => {
    window.history.replaceState({ idx: 2 }, "", "/employee/projects");
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "http://localhost/employee/dashboard",
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/employee/projects", state: null }]}>
        <Probe role="ADMIN" />
      </MemoryRouter>
    );

    expect(screen.getByTestId("can-use-history").textContent).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "go-back" }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it("disables history back for deep-link state", () => {
    window.history.replaceState({ idx: 9 }, "", "/employee/projects");
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "http://localhost/employee/dashboard",
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/employee/projects", state: { fromEmailDeepLink: true } }]}>
        <Probe role={null} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("can-use-history").textContent).toBe("false");
    expect(screen.getByTestId("fallback-path").textContent).toBe("/");

    fireEvent.click(screen.getByRole("button", { name: "go-back" }));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
