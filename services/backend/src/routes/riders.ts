import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import {
  acceptOrderAsRider,
  getActiveOrderForRider,
  getOrCreateRiderProfile,
  listAvailableOrdersForRiders,
  updateRiderStatus,
} from "../services/riderService.js";
import { updateRiderStatusSchema } from "./riders.schemas.js";

export const ridersRouter = Router();
ridersRouter.use(requireFirebaseReady, requireAuth, requireRole("rider", "platform_admin"));

ridersRouter.get("/me", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await getOrCreateRiderProfile(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

ridersRouter.patch("/me", async (req: AuthenticatedRequest, res, next) => {
  try {
    const updates = updateRiderStatusSchema.parse(req.body);
    res.json(await updateRiderStatus(req.user!.uid, updates));
  } catch (err) {
    next(err);
  }
});

ridersRouter.get("/available-orders", async (_req, res, next) => {
  try {
    res.json(await listAvailableOrdersForRiders());
  } catch (err) {
    next(err);
  }
});

ridersRouter.get("/active-order", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await getActiveOrderForRider(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

ridersRouter.post("/orders/:id/accept", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await acceptOrderAsRider(req.params.id as string, req.user!.uid));
  } catch (err) {
    next(err);
  }
});
