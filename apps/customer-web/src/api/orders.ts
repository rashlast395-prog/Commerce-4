import type { CreateOrderInput, Order } from "@richys-eat/shared-types";
import { api } from "./client";

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return api.post<Order>("/orders", input);
}

export function getOrder(id: string): Promise<Order> {
  return api.get<Order>(`/orders/${id}`);
}

export function listMyOrders(): Promise<Order[]> {
  return api.get<Order[]>("/orders/mine");
}
