import type { NextFunction, Request, Response } from "express";
import { getAuth, isFirebaseInitialized } from "../config/firebase.js";
import { logger } from "../config/logger.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string | undefined;
    role: string | undefined;
    restaurantIds: string[];
  };
}

/**
 * Verifies the Firebase ID token in the Authorization header (Bearer <token>).
 * Role and restaurantIds are read from Firebase custom claims (set by
 * userService.assignUserRole via the Admin SDK) — never trust a client-sent
 * role/restaurantIds field.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  if (!isFirebaseInitialized()) {
    res.status(503).json({ error: "Auth service unavailable: Firebase Admin not configured" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const claims = decoded as Record<string, unknown>;
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: claims["role"] as string | undefined,
      restaurantIds: Array.isArray(claims["restaurantIds"]) ? (claims["restaurantIds"] as string[]) : [],
    };
    next();
  } catch (err) {
    logger.warn("Token verification failed", { error: (err as Error).message });
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Restricts a route to one or more roles. Must run after requireAuth.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/**
 * Restricts a route to platform_admin, or a restaurant_owner/restaurant_staff
 * scoped to the :restaurantId (or :id) route param. Must run after requireAuth.
 */
export function requireRestaurantAccess(paramName: "id" | "restaurantId" = "id") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const restaurantId = req.params[paramName];
    const role = req.user?.role;

    if (role === "platform_admin") {
      next();
      return;
    }
    if (
      (role === "restaurant_owner" || role === "restaurant_staff") &&
      restaurantId &&
      req.user?.restaurantIds.includes(restaurantId)
    ) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not manage this restaurant" });
  };
}
