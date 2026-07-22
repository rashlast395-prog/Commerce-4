import { getFirestore } from "../config/firebase.js";
import { sendToUsers } from "../ws/server.js";

export type NotificationType = "order_status" | "new_order" | "reservation" | "message" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export async function createNotification(
  userId: string,
  input: Omit<Notification, "id" | "isRead" | "createdAt">,
): Promise<Notification> {
  const db = getFirestore();
  const ref = db.collection("notifications").doc(userId).collection("items").doc();
  const notification: Notification = {
    id: ref.id,
    ...input,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await ref.set(notification);
  sendToUsers([userId], { type: "notification:new", payload: notification });
  return notification;
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const db = getFirestore();
  const snap = await db
    .collection("notifications")
    .doc(userId)
    .collection("items")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => doc.data() as Notification);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const db = getFirestore();
  await db.collection("notifications").doc(userId).collection("items").doc(notificationId).update({ isRead: true });
}
