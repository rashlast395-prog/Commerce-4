import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRestaurantAccess } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import {
  createReservation,
  listReservationsForCustomer,
  listReservationsForRestaurant,
  updateReservationStatus,
} from "../services/reservationService.js";
import { createReservationSchema, updateReservationStatusSchema } from "./reservations.schemas.js";

export const reservationsRouter = Router();
reservationsRouter.use(requireFirebaseReady, requireAuth);

reservationsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createReservationSchema.parse(req.body);
    res.status(201).json(await createReservation(req.user!.uid, input));
  } catch (err) {
    next(err);
  }
});

reservationsRouter.get("/mine", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listReservationsForCustomer(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

reservationsRouter.get(
  "/restaurant/:restaurantId",
  requireRestaurantAccess("restaurantId"),
  async (req, res, next) => {
    try {
      res.json(await listReservationsForRestaurant(req.params.restaurantId as string));
    } catch (err) {
      next(err);
    }
  },
);

reservationsRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = updateReservationStatusSchema.parse(req.body);
    res.json(await updateReservationStatus(req.params.id as string, status));
  } catch (err) {
    next(err);
  }
});
