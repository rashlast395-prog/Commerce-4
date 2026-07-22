import { z } from "zod";

export const bootstrapUserSchema = z.object({
  displayName: z.string().min(1).max(120),
  phone: z.string().max(20).nullable().optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(["customer", "restaurant_owner", "restaurant_staff", "rider", "platform_admin"]),
  restaurantIds: z.array(z.string()).optional().default([]),
});
