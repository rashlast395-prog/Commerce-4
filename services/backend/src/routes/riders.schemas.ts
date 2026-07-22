import { z } from "zod";

export const updateRiderStatusSchema = z.object({
  isOnline: z.boolean().optional(),
  currentLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});
