import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth, requireRestaurantAccess, requireRole } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import {
  createMenuItem,
  createRestaurant,
  deleteMenuItem,
  getRestaurantById,
  listAllMenuItemsForOwner,
  listAllRestaurantsForAdmin,
  listApprovedRestaurants,
  listMenuItems,
  updateMenuItem,
  updateRestaurant,
  updateRestaurantStatus,
} from "../services/restaurantService.js";
import {
  createRestaurantSchema,
  menuItemSchema,
  updateMenuItemSchema,
  updateRestaurantSchema,
  updateRestaurantStatusSchema,
} from "./restaurants.schemas.js";

export const restaurantsRouter = Router();
restaurantsRouter.use(requireFirebaseReady);

// ---- public browsing ----

restaurantsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listApprovedRestaurants());
  } catch (err) {
    next(err);
  }
});

// ---- platform admin ----

restaurantsRouter.get("/admin/all", requireAuth, requireRole("platform_admin"), async (_req, res, next) => {
  try {
    res.json(await listAllRestaurantsForAdmin());
  } catch (err) {
    next(err);
  }
});

restaurantsRouter.post("/", requireAuth, requireRole("platform_admin"), async (req, res, next) => {
  try {
    const input = createRestaurantSchema.parse(req.body);
    res.status(201).json(await createRestaurant(input));
  } catch (err) {
    next(err);
  }
});

restaurantsRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("platform_admin"),
  async (req, res, next) => {
    try {
      const { status } = updateRestaurantStatusSchema.parse(req.body);
      res.json(await updateRestaurantStatus(req.params.id as string, status));
    } catch (err) {
      next(err);
    }
  },
);

// ---- restaurant detail (public) + owner management ----

restaurantsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getRestaurantById(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

restaurantsRouter.patch(
  "/:id",
  requireAuth,
  requireRestaurantAccess("id"),
  async (req, res, next) => {
    try {
      const updates = updateRestaurantSchema.parse(req.body);
      res.json(await updateRestaurant(req.params.id as string, updates));
    } catch (err) {
      next(err);
    }
  },
);

// ---- menu items ----

restaurantsRouter.get("/:id/menu-items", async (req, res, next) => {
  try {
    res.json(await listMenuItems(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

restaurantsRouter.get(
  "/:id/menu-items/all",
  requireAuth,
  requireRestaurantAccess("id"),
  async (req, res, next) => {
    try {
      res.json(await listAllMenuItemsForOwner(req.params.id as string));
    } catch (err) {
      next(err);
    }
  },
);

restaurantsRouter.post(
  "/:id/menu-items",
  requireAuth,
  requireRestaurantAccess("id"),
  async (req, res, next) => {
    try {
      const input = menuItemSchema.parse(req.body);
      res.status(201).json(await createMenuItem(req.params.id as string, input));
    } catch (err) {
      next(err);
    }
  },
);

restaurantsRouter.patch(
  "/:id/menu-items/:itemId",
  requireAuth,
  requireRestaurantAccess("id"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const updates = updateMenuItemSchema.parse(req.body);
      res.json(await updateMenuItem(req.params.id as string, req.params.itemId as string, updates));
    } catch (err) {
      next(err);
    }
  },
);

restaurantsRouter.delete(
  "/:id/menu-items/:itemId",
  requireAuth,
  requireRestaurantAccess("id"),
  async (req, res, next) => {
    try {
      await deleteMenuItem(req.params.id as string, req.params.itemId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
