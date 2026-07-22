import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRestaurantAccess } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { canActorSetStatus } from "../domain/orderTransitions.js";
import {
  createOrder,
  getOrderById,
  listOrdersForCustomer,
  listOrdersForRestaurant,
  transitionOrderStatus,
} from "../services/orderService.js";
import { createOrderSchema, updateOrderStatusSchema } from "./orders.schemas.js";

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await createOrder(req.user!.uid, input);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/mine", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listOrdersForCustomer(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

ordersRouter.get(
  "/restaurant/:restaurantId",
  requireAuth,
  requireRestaurantAccess("restaurantId"),
  async (req, res, next) => {
    try {
      res.json(await listOrdersForRestaurant(req.params.restaurantId as string));
    } catch (err) {
      next(err);
    }
  },
);

ordersRouter.get("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await getOrderById(req.params.id as string);
    const uid = req.user!.uid;
    const role = req.user!.role;
    const isParticipant =
      order.customerId === uid ||
      order.riderId === uid ||
      role === "platform_admin" ||
      ((role === "restaurant_owner" || role === "restaurant_staff") &&
        req.user!.restaurantIds.includes(order.restaurantId));
    if (!isParticipant) {
      throw new ApiError(403, "You do not have access to this order");
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

ordersRouter.patch("/:id/status", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = updateOrderStatusSchema.parse(req.body);
    const order = await getOrderById(req.params.id as string);

    const role = req.user!.role;
    const isScopedToThisRestaurant =
      (role === "restaurant_owner" || role === "restaurant_staff") &&
      req.user!.restaurantIds.includes(order.restaurantId);
    const isAssignedRider = role === "rider" && order.riderId === req.user!.uid;

    if (role !== "platform_admin" && !isScopedToThisRestaurant && !isAssignedRider) {
      throw new ApiError(403, "You do not have access to this order");
    }
    if (!canActorSetStatus(role, status)) {
      throw new ApiError(403, `Your role cannot set order status to "${status}"`);
    }

    res.json(await transitionOrderStatus(req.params.id as string, status, req.user!.uid));
  } catch (err) {
    next(err);
  }
});
