import type { OrderStatus } from "@richys-eat/shared-types";
import { ORDER_STATUS_COLOR } from "@richys-eat/design-tokens";

const LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  payment_confirmed: "Payment confirmed",
  rejected: "Rejected",
  accepted_by_restaurant: "Accepted",
  cancelled_by_customer: "Cancelled",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  cancelled_by_restaurant: "Cancelled by restaurant",
};

const COLOR_TO_BADGE_CLASS: Record<string, string> = {
  success: "re-badge-success",
  warning: "re-badge-warning",
  error: "re-badge-error",
  accent: "re-badge-accent",
  primary: "re-badge-accent",
  muted: "re-badge-accent",
};

export function renderOrderStatusBadge(status: OrderStatus): string {
  const badgeClass = COLOR_TO_BADGE_CLASS[ORDER_STATUS_COLOR[status]] ?? "re-badge-accent";
  return `<span class="re-badge ${badgeClass}">${LABELS[status]}</span>`;
}
