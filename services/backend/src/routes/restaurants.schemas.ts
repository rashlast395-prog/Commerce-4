import { z } from "zod";

const geopointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(120),
  ownerId: z.string().min(1),
  description: z.string().max(1000).default(""),
  cuisineTypes: z.array(z.string()).default([]),
  address: z.object({
    line1: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    region: z.string().min(1).max(100),
    geopoint: geopointSchema,
  }),
  commissionRate: z.number().min(0).max(1),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  isOpenNow: z.boolean().optional(),
  deliveryFeeOverride: z.number().int().min(0).nullable().optional(),
  operatingHours: z
    .array(
      z.object({
        day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
        open: z.string(),
        close: z.string(),
        isClosed: z.boolean(),
      }),
    )
    .optional(),
});

export const updateRestaurantStatusSchema = z.object({
  status: z.enum(["pending", "approved", "suspended", "rejected"]),
});

const modifierSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.object({ label: z.string().min(1), priceDelta: z.number().int() })).min(1),
});

export const menuItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  price: z.number().int().min(0),
  category: z.string().min(1).max(60),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().nullable().optional(),
  modifiers: z.array(modifierSchema).default([]),
});

export const updateMenuItemSchema = menuItemSchema.partial();
