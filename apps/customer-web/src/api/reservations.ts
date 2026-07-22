import { api } from "./client";

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  partySize: number;
  reservationTime: string;
  status: "requested" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  createdAt: string;
}

export function createReservation(input: {
  restaurantId: string;
  partySize: number;
  reservationTime: string;
  notes: string | null;
}): Promise<Reservation> {
  return api.post<Reservation>("/reservations", input);
}

export function listMyReservations(): Promise<Reservation[]> {
  return api.get<Reservation[]>("/reservations/mine");
}
