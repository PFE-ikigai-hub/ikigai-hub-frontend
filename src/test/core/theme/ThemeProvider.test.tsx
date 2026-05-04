import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "@/core/theme/ThemeProvider";

function ThemeProbe() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")} type="button">
        set-dark
      </button>
      <button onClick={toggleTheme} type="button">
        toggle
      </button>
    </div>
  );
}

function DeferredThemeProbe() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return null;
  return <ThemeProbe />;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("starts from localStorage and updates class + storage", async () => {
    localStorage.setItem("ikigai-theme", "dark");

    render(
      <ThemeProvider>
        <DeferredThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("ikigai-theme")).toBe("dark");
  });

  it("uses system preference when no stored theme", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(
      <ThemeProvider>
        <DeferredThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });
  });

  it("setTheme and toggleTheme update state", async () => {
    render(
      <ThemeProvider>
        <DeferredThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });

    fireEvent.click(screen.getByRole("button", { name: "set-dark" }));
    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });
  });
});
