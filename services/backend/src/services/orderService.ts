import type { CreateOrderInput, Order, OrderStatus } from "@richys-eat/shared-types";
import { ORDER_STATUS_TRANSITIONS } from "@richys-eat/shared-types";
import { computeOrderTotals } from "../domain/orderPricing.js";
import { getFirestore } from "../config/firebase.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createNotification } from "./notificationService.js";
import { getMenuItemsByIds, getRestaurantById } from "./restaurantService.js";
import { broadcast } from "../ws/server.js";

const ORDERS_COLLECTION = "orders";

export async function createOrder(customerId: string, input: CreateOrderInput): Promise<Order> {
  if (input.items.length === 0) {
    throw new ApiError(400, "Order must contain at least one item");
  }

  const restaurant = await getRestaurantById(input.restaurantId);

  if (restaurant.status !== "approved") {
    throw new ApiError(409, "This restaurant is not currently accepting orders");
  }
  if (!restaurant.isOpenNow) {
    throw new ApiError(409, `${restaurant.name} is currently closed`);
  }

  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItemsById = await getMenuItemsByIds(input.restaurantId, menuItemIds);

  const { lineItems, subtotal, deliveryFee, platformCommission, total } = computeOrderTotals(
    restaurant,
    menuItemsById,
    input.items,
  );

  const now = new Date().toISOString();
  const db = getFirestore();
  const ref = db.collection(ORDERS_COLLECTION).doc();

  const order: Order = {
    id: ref.id,
    customerId,
    restaurantId: restaurant.id,
    riderId: null,
    items: lineItems,
    subtotal,
    deliveryFee,
    platformCommission,
    total,
    status: "placed",
    deliveryAddress: input.deliveryAddress,
    paymentId: null,
    paymentStatus: "pending",
    placedAt: now,
    statusHistory: [{ status: "placed", at: now, by: customerId }],
  };

  await ref.set(order);
  logger.info("Order created", { orderId: order.id, restaurantId: restaurant.id, total });

  await createNotification(restaurant.ownerId, {
    type: "new_order",
    title: "New order",
    body: `A new order just came in — ${lineItems.length} item${lineItems.length === 1 ? "" : "s"}.`,
    data: { orderId: order.id },
  }).catch((err) => logger.warn("Failed to notify restaurant owner", { error: (err as Error).message }));

  return order;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const db = getFirestore();
  const doc = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
  if (!doc.exists) {
    throw new ApiError(404, `Order ${orderId} not found`);
  }
  return doc.data() as Order;
}

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const db = getFirestore();
  const snap = await db
    .collection(ORDERS_COLLECTION)
    .where("customerId", "==", customerId)
    .orderBy("placedAt", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as Order);
}

export async function listOrdersForRestaurant(restaurantId: string): Promise<Order[]> {
  const db = getFirestore();
  const snap = await db
    .collection(ORDERS_COLLECTION)
    .where("restaurantId", "==", restaurantId)
    .orderBy("placedAt", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as Order);
}

/** Validates a transition against ORDER_STATUS_TRANSITIONS before writing (used from Phase 3+ routes). */
export async function transitionOrderStatus(orderId: string, nextStatus: OrderStatus, actorId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  const allowed = ORDER_STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(409, `Cannot transition order from "${order.status}" to "${nextStatus}"`);
  }

  const db = getFirestore();
  const now = new Date().toISOString();
  const statusEvent = { status: nextStatus, at: now, by: actorId };

  await db
    .collection(ORDERS_COLLECTION)
    .doc(orderId)
    .update({
      status: nextStatus,
      statusHistory: [...order.statusHistory, statusEvent],
    });

  const updated: Order = { ...order, status: nextStatus, statusHistory: [...order.statusHistory, statusEvent] };

  broadcast({ type: "order:status_changed", payload: { orderId, status: nextStatus } });

  const recipients = [order.customerId, order.riderId].filter((id): id is string => Boolean(id));
  await Promise.all(
    recipients.map((uid) =>
      createNotification(uid, {
        type: "order_status",
        title: "Order update",
        body: `Your order is now: ${STATUS_LABELS[nextStatus]}.`,
        data: { orderId, status: nextStatus },
      }),
    ),
  ).catch((err) => logger.warn("Failed to notify order participants", { error: (err as Error).message }));

  return updated;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "placed",
  payment_confirmed: "payment confirmed",
  rejected: "rejected",
  accepted_by_restaurant: "accepted by the restaurant",
  cancelled_by_customer: "cancelled",
  preparing: "being prepared",
  ready_for_pickup: "ready for pickup",
  rider_assigned: "assigned to a rider",
  picked_up: "picked up",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  delivery_failed: "delivery failed",
  cancelled_by_restaurant: "cancelled by the restaurant",
};
