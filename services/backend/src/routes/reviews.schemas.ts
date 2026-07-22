import { z } from "zod";

export const createReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).nullable().optional().default(null),
});
