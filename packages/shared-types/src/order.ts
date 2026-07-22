import type { GeoPoint } from "./restaurant.js";

export type OrderStatus =
  | "placed"
  | "payment_confirmed"
  | "rejected"
  | "accepted_by_restaurant"
  | "cancelled_by_customer"
  | "preparing"
  | "ready_for_pickup"
  | "rider_assigned"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "cancelled_by_restaurant";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["payment_confirmed", "rejected"],
  payment_confirmed: ["accepted_by_restaurant", "cancelled_by_customer"],
  rejected: [],
  accepted_by_restaurant: ["preparing", "cancelled_by_restaurant"],
  cancelled_by_customer: [],
  preparing: ["ready_for_pickup", "cancelled_by_restaurant"],
  ready_for_pickup: ["rider_assigned", "cancelled_by_restaurant"],
  rider_assigned: ["picked_up", "cancelled_by_restaurant"],
  picked_up: ["out_for_delivery"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivered: [],
  delivery_failed: [],
  cancelled_by_restaurant: [],
};

export interface OrderLineItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedModifiers: { name: string; option: string; priceDelta: number }[];
  lineTotal: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  by: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  riderId: string | null;
  items: OrderLineItem[];
  subtotal: number;
  deliveryFee: number;
  platformCommission: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: { line1: string; city: string; geopoint: GeoPoint };
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  placedAt: string;
  statusHistory: OrderStatusEvent[];
}
