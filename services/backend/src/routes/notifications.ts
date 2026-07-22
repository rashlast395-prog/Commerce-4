import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import { listNotifications, markNotificationRead } from "../services/notificationService.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireFirebaseReady, requireAuth);

notificationsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listNotifications(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch("/:id/read", async (req: AuthenticatedRequest, res, next) => {
  try {
    await markNotificationRead(req.user!.uid, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
