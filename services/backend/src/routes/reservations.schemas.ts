import { z } from "zod";

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1),
  partySize: z.number().int().min(1).max(30),
  reservationTime: z.string().datetime(),
  notes: z.string().max(500).nullable().optional().default(null),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(["requested", "confirmed", "cancelled", "completed", "no_show"]),
});
