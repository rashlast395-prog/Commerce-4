import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRestaurantAccess } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

export const analyticsRouter = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

async function proxyToAiService(path: string): Promise<unknown> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    headers: { "X-API-Key": process.env.AI_SERVICE_API_KEY ?? "" },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, (body as { error?: string })?.error ?? "AI service request failed");
  }
  return body;
}

analyticsRouter.get(
  "/restaurant/:restaurantId/revenue-trends",
  requireAuth,
  requireRestaurantAccess("restaurantId"),
  async (req, res, next) => {
    try {
      res.json(await proxyToAiService(`/analytics/revenue-trends?restaurant_id=${req.params.restaurantId}`));
    } catch (err) {
      next(err);
    }
  },
);

analyticsRouter.get(
  "/restaurant/:restaurantId/top-items",
  requireAuth,
  requireRestaurantAccess("restaurantId"),
  async (req, res, next) => {
    try {
      res.json(await proxyToAiService(`/analytics/top-items?restaurant_id=${req.params.restaurantId}`));
    } catch (err) {
      next(err);
    }
  },
);

analyticsRouter.get(
  "/restaurant/:restaurantId/customer-segments",
  requireAuth,
  requireRestaurantAccess("restaurantId"),
  async (req, res, next) => {
    try {
      res.json(await proxyToAiService(`/analytics/customer-segments?restaurant_id=${req.params.restaurantId}`));
    } catch (err) {
      next(err);
    }
  },
);

analyticsRouter.get("/platform/revenue-trends", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user!.role !== "platform_admin") throw new ApiError(403, "Platform admin only");
    res.json(await proxyToAiService("/analytics/revenue-trends"));
  } catch (err) {
    next(err);
  }
});
