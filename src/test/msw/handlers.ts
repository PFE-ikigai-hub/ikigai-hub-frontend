import { http, HttpResponse } from "msw";
import type { ApiNotification } from "@/types/index";


let notificationsStore: ApiNotification[] = [];

export function setMockNotifications(items: ApiNotification[]) {
  notificationsStore = [...items];
}

function notificationsPage() {
  return {
    content: notificationsStore,
    totalElements: notificationsStore.length,
    totalPages: notificationsStore.length ? 1 : 0,
    number: 0,
    size: notificationsStore.length,
    first: true,
    last: true,
    empty: notificationsStore.length === 0,
  };
}

export const handlers = [
  http.get("/api/notifications", () => {
    return HttpResponse.json(notificationsPage());
  }),

  http.get("/api/notifications/unread-count", () => {
    const count = notificationsStore.filter((item) => !item.lu).length;
    return HttpResponse.json({ count });
  }),

  http.patch("/api/notifications/:id/read", ({ params }) => {
    const id = Number(params.id);
    const target = notificationsStore.find((item) => item.id === id);
    if (!target) {
      return new HttpResponse(null, { status: 404 });
    }
    target.lu = true;
    target.readAt = new Date().toISOString();
    return HttpResponse.json(target);
  }),

  http.patch("/api/notifications/read-all", () => {
    let updated = 0;
    notificationsStore = notificationsStore.map((item) => {
      if (!item.lu) {
        updated += 1;
      }
      return { ...item, lu: true, readAt: item.readAt ?? new Date().toISOString() };
    });
    return HttpResponse.json({ updated });
  }),

  http.delete("/api/notifications/:id", ({ params }) => {
    const id = Number(params.id);
    notificationsStore = notificationsStore.filter((item) => item.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
