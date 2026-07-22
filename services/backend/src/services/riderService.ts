import type { Order } from "@richys-eat/shared-types";
import { getFirestore } from "../config/firebase.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";
import { transitionOrderStatus } from "./orderService.js";

const RIDERS_COLLECTION = "riders";
const ORDERS_COLLECTION = "orders";

export interface RiderProfile {
  uid: string;
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  locationUpdatedAt: string | null;
  activeOrderId: string | null;
  vehicleType: "bike" | "motorbike" | "car";
  ratingAvg: number;
  ratingCount: number;
}

export async function getOrCreateRiderProfile(uid: string): Promise<RiderProfile> {
  const db = getFirestore();
  const ref = db.collection(RIDERS_COLLECTION).doc(uid);
  const doc = await ref.get();
  if (doc.exists) return doc.data() as RiderProfile;

  const profile: RiderProfile = {
    uid,
    isOnline: false,
    currentLocation: null,
    locationUpdatedAt: null,
    activeOrderId: null,
    vehicleType: "motorbike",
    ratingAvg: 0,
    ratingCount: 0,
  };
  await ref.set(profile);
  return profile;
}

export async function updateRiderStatus(
  uid: string,
  updates: { isOnline?: boolean; currentLocation?: { lat: number; lng: number } },
): Promise<RiderProfile> {
  const db = getFirestore();
  const ref = db.collection(RIDERS_COLLECTION).doc(uid);
  await getOrCreateRiderProfile(uid); // ensure it exists

  const patch: Record<string, unknown> = {};
  if (updates.isOnline !== undefined) patch["isOnline"] = updates.isOnline;
  if (updates.currentLocation) {
    patch["currentLocation"] = updates.currentLocation;
    patch["locationUpdatedAt"] = new Date().toISOString();
  }

  await ref.update(patch);
  const updated = await ref.get();
  return updated.data() as RiderProfile;
}

/** Orders ready for pickup with no rider assigned yet — the rider's job pool. */
export async function listAvailableOrdersForRiders(): Promise<Order[]> {
  const db = getFirestore();
  const snap = await db
    .collection(ORDERS_COLLECTION)
    .where("status", "==", "ready_for_pickup")
    .where("riderId", "==", null)
    .orderBy("placedAt", "asc")
    .get();
  return snap.docs.map((doc) => doc.data() as Order);
}

export async function getActiveOrderForRider(uid: string): Promise<Order | null> {
  const db = getFirestore();
  const snap = await db.collection(ORDERS_COLLECTION).where("riderId", "==", uid).get();
  const active = snap.docs
    .map((doc) => doc.data() as Order)
    .find((order) => !["delivered", "delivery_failed", "cancelled_by_restaurant"].includes(order.status));
  return active ?? null;
}

/** Rider claims an order from the available pool — first to claim wins (simple, no locking yet). */
export async function acceptOrderAsRider(orderId: string, riderId: string): Promise<Order> {
  const db = getFirestore();
  const ref = db.collection(ORDERS_COLLECTION).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, `Order ${orderId} not found`);
  const order = doc.data() as Order;

  if (order.status !== "ready_for_pickup") {
    throw new ApiError(409, "This order is no longer available for pickup");
  }
  if (order.riderId) {
    throw new ApiError(409, "This order has already been claimed by another rider");
  }

  await ref.update({ riderId });
  const updated = await transitionOrderStatus(orderId, "rider_assigned", riderId);

  const riderRef = db.collection(RIDERS_COLLECTION).doc(riderId);
  await riderRef.set({ activeOrderId: orderId }, { merge: true });

  logger.info("Order accepted by rider", { orderId, riderId });
  return updated;
}
