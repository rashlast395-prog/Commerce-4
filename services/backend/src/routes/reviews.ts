import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import { createReview, listReviewsForRestaurant } from "../services/reviewService.js";
import { createReviewSchema } from "./reviews.schemas.js";

export const reviewsRouter = Router();
reviewsRouter.use(requireFirebaseReady);

reviewsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createReviewSchema.parse(req.body);
    res.status(201).json(await createReview(req.user!.uid, input));
  } catch (err) {
    next(err);
  }
});

reviewsRouter.get("/restaurant/:restaurantId", async (req, res, next) => {
  try {
    res.json(await listReviewsForRestaurant(req.params.restaurantId as string));
  } catch (err) {
    next(err);
  }
});
