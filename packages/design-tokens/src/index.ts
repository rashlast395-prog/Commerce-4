import type { OrderStatus } from "@richys-eat/shared-types";

export const colors = {
  primary: "#0F766E",
  primaryDark: "#0B5E57",
  secondary: "#06B6D4",
  accent: "#10B981",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

export const gradientPrimary = "linear-gradient(135deg, #0F766E, #06B6D4)";
export const gradientAccent = "linear-gradient(135deg, #06B6D4, #10B981)";

/** Maps each order status to a semantic color for badges/timelines (Phase 2+). */
export const ORDER_STATUS_COLOR: Record<OrderStatus, keyof typeof colors> = {
  placed: "muted",
  payment_confirmed: "accent",
  rejected: "error",
  accepted_by_restaurant: "accent",
  cancelled_by_customer: "error",
  preparing: "warning",
  ready_for_pickup: "warning",
  rider_assigned: "accent",
  picked_up: "accent",
  out_for_delivery: "primary",
  delivered: "success",
  delivery_failed: "error",
  cancelled_by_restaurant: "error",
};
