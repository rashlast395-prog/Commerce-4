import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assignUserRole, bootstrapUserProfile, getUserProfile } from "../services/userService.js";
import { assignRoleSchema, bootstrapUserSchema } from "./auth.schemas.js";

export const authRouter = Router();

/**
 * Called by the frontend right after Firebase sign-in/sign-up (email,
 * Google, or GitHub). Idempotent: creates the Firestore profile + default
 * "customer" role claim on first call, just returns the existing profile
 * on every call after that.
 */
authRouter.post("/bootstrap", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = bootstrapUserSchema.parse(req.body);
    const user = await bootstrapUserProfile({
      uid: req.user!.uid,
      email: req.user!.email ?? "",
      displayName: body.displayName,
      phone: body.phone ?? null,
      providerIds: [],
    });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserProfile(req.user!.uid);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * platform_admin only — promotes a user to restaurant_owner/staff/rider/admin,
 * or scopes a restaurant_owner/staff to specific restaurant IDs.
 */
authRouter.patch(
  "/users/:uid/role",
  requireAuth,
  requireRole("platform_admin"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const body = assignRoleSchema.parse(req.body);
      const user = await assignUserRole({
        uid: req.params.uid as string,
        role: body.role,
        restaurantIds: body.restaurantIds,
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);
