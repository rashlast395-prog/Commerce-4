import type { Order, OrderStatus } from "@richys-eat/shared-types";
import { api } from "./client";

export function listAvailableOrders(): Promise<Order[]> {
  return api.get<Order[]>("/riders/available-orders");
}

export function getActiveOrder(): Promise<Order | null> {
  return api.get<Order | null>("/riders/active-order");
}

export function acceptOrder(orderId: string): Promise<Order> {
  return api.post<Order>(`/riders/orders/${orderId}/accept`);
}

export function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return api.patch<Order>(`/orders/${orderId}/status`, { status });
}
