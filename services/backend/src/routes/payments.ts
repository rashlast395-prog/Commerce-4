import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import { initializePayment, mockCompletePayment } from "../services/paymentService.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireFirebaseReady);

const initSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(["paystack", "flutterwave"]),
});

paymentsRouter.post("/initialize", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { orderId, provider } = initSchema.parse(req.body);
    const result = await initializePayment(orderId, req.user!.uid, req.user!.email ?? "", provider);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Dev/testing only — simulates a successful payment without a live gateway. */
paymentsRouter.post("/:paymentId/mock-complete", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Mock payment completion is disabled in production" });
      return;
    }
    await mockCompletePayment(req.params.paymentId as string, req.user!.uid);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
