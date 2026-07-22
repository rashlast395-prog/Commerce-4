import { getFirestore } from "../config/firebase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createNotification } from "./notificationService.js";
import { getRestaurantById } from "./restaurantService.js";

export type ReservationStatus = "requested" | "confirmed" | "cancelled" | "completed" | "no_show";

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  partySize: number;
  reservationTime: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
}

const COLLECTION = "reservations";

export async function createReservation(
  customerId: string,
  input: { restaurantId: string; partySize: number; reservationTime: string; notes: string | null },
): Promise<Reservation> {
  const restaurant = await getRestaurantById(input.restaurantId);
  if (restaurant.status !== "approved") {
    throw new ApiError(409, "This restaurant isn't accepting reservations right now");
  }

  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc();
  const reservation: Reservation = {
    id: ref.id,
    restaurantId: input.restaurantId,
    customerId,
    partySize: input.partySize,
    reservationTime: input.reservationTime,
    status: "requested",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  await ref.set(reservation);

  await createNotification(restaurant.ownerId, {
    type: "reservation",
    title: "New reservation request",
    body: `Party of ${input.partySize} for ${new Date(input.reservationTime).toLocaleString()}.`,
    data: { reservationId: ref.id },
  }).catch(() => undefined);

  return reservation;
}

export async function listReservationsForCustomer(customerId: string): Promise<Reservation[]> {
  const db = getFirestore();
  const snap = await db
    .collection(COLLECTION)
    .where("customerId", "==", customerId)
    .orderBy("reservationTime", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as Reservation);
}

export async function listReservationsForRestaurant(restaurantId: string): Promise<Reservation[]> {
  const db = getFirestore();
  const snap = await db
    .collection(COLLECTION)
    .where("restaurantId", "==", restaurantId)
    .orderBy("reservationTime", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as Reservation);
}

export async function updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation> {
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, "Reservation not found");
  await ref.update({ status });
  const updated = await ref.get();
  return updated.data() as Reservation;
}
