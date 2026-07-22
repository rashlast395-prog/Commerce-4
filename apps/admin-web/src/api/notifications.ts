import { api } from "./client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export function listNotifications(): Promise<AppNotification[]> {
  return api.get<AppNotification[]>("/notifications");
}

export function markNotificationRead(id: string): Promise<void> {
  return api.patch<void>(`/notifications/${id}/read`);
}
