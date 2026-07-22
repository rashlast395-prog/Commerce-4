import type { Order, OrderStatus } from "@richys-eat/shared-types";
import { api } from "./client";

export function listOrdersForRestaurant(restaurantId: string): Promise<Order[]> {
  return api.get<Order[]>(`/orders/restaurant/${restaurantId}`);
}

export function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return api.patch<Order>(`/orders/${orderId}/status`, { status });
}
