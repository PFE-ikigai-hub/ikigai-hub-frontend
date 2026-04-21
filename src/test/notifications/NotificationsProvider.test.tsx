import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NotificationsProvider, useNotifications } from "@/core/notifications/NotificationsProvider";
import { useAuth } from "@/core/auth/AuthProvider";
import { setMockNotifications } from "@/test/msw/handlers";
import type { ApiNotification } from "@/types/index";

vi.mock("@/core/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@stomp/stompjs", () => ({
  Client: vi.fn().mockImplementation((options: any) => ({
    activate: () => options.onConnect?.(),
    deactivate: vi.fn(),
    subscribe: vi.fn(),
  })),
}));

const mockedUseAuth = vi.mocked(useAuth);

function Probe() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "idle"}</div>
      <div data-testid="unread">{unreadCount}</div>
      <div data-testid="count">{notifications.length}</div>
      <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>{notif.titre}</li>
        ))}
      </ul>
      <button type="button" onClick={() => markAsRead(1)}>
        mark-1
      </button>
      <button type="button" onClick={() => markAllAsRead()}>
        mark-all
      </button>
      <button type="button" onClick={() => deleteNotification(1)}>
        delete-1
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <NotificationsProvider>
      <Probe />
    </NotificationsProvider>
  );
}

function buildNotification(overrides: Partial<ApiNotification>): ApiNotification {
  return {
    id: overrides.id ?? 1,
    type: overrides.type ?? "VERSION_UPLOADED",
    titre: overrides.titre ?? "Notif",
    message: overrides.message ?? "Message",
    routePath: overrides.routePath ?? null,
    dataJson: overrides.dataJson ?? null,
    lu: overrides.lu ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    readAt: overrides.readAt ?? null,
    acteurId: overrides.acteurId ?? null,
    projetId: overrides.projetId ?? null,
    livrableId: overrides.livrableId ?? null,
    versionId: overrides.versionId ?? null,
  };
}

describe("NotificationsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: "7", firstName: "Emp", lastName: "One", email: "emp@ikigai.com", role: "EMPLOYE" },
      role: "EMPLOYE",
      isLoading: false,
      isFullyReady: true,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("loads notifications and unread count", async () => {
    setMockNotifications([
      buildNotification({ id: 1, titre: "New version", lu: false }),
      buildNotification({ id: 2, titre: "Comment", lu: true }),
    ]);

    renderProvider();

    expect(await screen.findByText("New version")).toBeInTheDocument();
    expect(screen.getByText("Comment")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
  });

  it("marks one notification as read", async () => {
    setMockNotifications([buildNotification({ id: 1, titre: "To read", lu: false })]);
    renderProvider();

    expect(await screen.findByText("To read")).toBeInTheDocument();
    expect(screen.getByTestId("unread")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "mark-1" }));

    await waitFor(() => {
      expect(screen.getByTestId("unread")).toHaveTextContent("0");
    });
  });

  it("marks all notifications as read", async () => {
    setMockNotifications([
      buildNotification({ id: 1, titre: "A", lu: false }),
      buildNotification({ id: 2, titre: "B", lu: false }),
    ]);
    renderProvider();

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByTestId("unread")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "mark-all" }));

    await waitFor(() => {
      expect(screen.getByTestId("unread")).toHaveTextContent("0");
    });
  });

  it("deletes notification from list", async () => {
    setMockNotifications([buildNotification({ id: 1, titre: "Delete me", lu: false })]);
    renderProvider();

    expect(await screen.findByText("Delete me")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "delete-1" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
  });
});
