import { z } from "zod";

export const startConversationSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(2),
  type: z.enum(["customer_rider", "customer_restaurant", "restaurant_platform_admin"]),
  orderId: z.string().nullable().default(null),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});
