import type { OrderStatus } from "@richys-eat/shared-types";

const RESTAURANT_ALLOWED: OrderStatus[] = [
  "accepted_by_restaurant",
  "preparing",
  "ready_for_pickup",
  "rejected",
  "cancelled_by_restaurant",
];

const RIDER_ALLOWED: OrderStatus[] = ["picked_up", "out_for_delivery", "delivered", "delivery_failed"];

export function canActorSetStatus(role: string | undefined, nextStatus: OrderStatus): boolean {
  if (role === "platform_admin") return true;
  if (role === "restaurant_owner" || role === "restaurant_staff") return RESTAURANT_ALLOWED.includes(nextStatus);
  if (role === "rider") return RIDER_ALLOWED.includes(nextStatus);
  return false;
}
