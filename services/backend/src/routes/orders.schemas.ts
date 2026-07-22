import { z } from "zod";

const cartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  selectedModifiers: z
    .array(
      z.object({
        name: z.string().min(1),
        option: z.string().min(1),
      }),
    )
    .default([]),
});

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(cartItemSchema).min(1),
  deliveryAddress: z.object({
    line1: z.string().min(3).max(200),
    city: z.string().min(1).max(100),
    geopoint: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "placed",
    "payment_confirmed",
    "rejected",
    "accepted_by_restaurant",
    "cancelled_by_customer",
    "preparing",
    "ready_for_pickup",
    "rider_assigned",
    "picked_up",
    "out_for_delivery",
    "delivered",
    "delivery_failed",
    "cancelled_by_restaurant",
  ]),
});
