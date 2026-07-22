import type { MenuItem, Restaurant } from "@richys-eat/shared-types";
import { getAuth, getFirestore } from "../config/firebase.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";

const RESTAURANTS_COLLECTION = "restaurants";
const MENU_ITEMS_SUBCOLLECTION = "menuItems";

export async function listApprovedRestaurants(): Promise<Restaurant[]> {
  const db = getFirestore();
  const snap = await db.collection(RESTAURANTS_COLLECTION).where("status", "==", "approved").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Restaurant);
}

/** platform_admin only — every restaurant regardless of approval status. */
export async function listAllRestaurantsForAdmin(): Promise<Restaurant[]> {
  const db = getFirestore();
  const snap = await db.collection(RESTAURANTS_COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Restaurant);
}

export async function getRestaurantById(restaurantId: string): Promise<Restaurant> {
  const db = getFirestore();
  const doc = await db.collection(RESTAURANTS_COLLECTION).doc(restaurantId).get();
  if (!doc.exists) {
    throw new ApiError(404, `Restaurant ${restaurantId} not found`);
  }
  return { id: doc.id, ...doc.data() } as Restaurant;
}

export interface CreateRestaurantInput {
  name: string;
  ownerId: string;
  description: string;
  cuisineTypes: string[];
  address: Restaurant["address"];
  commissionRate: number;
}

/** platform_admin onboards a new restaurant, pre-approved and open by default. */
export async function createRestaurant(input: CreateRestaurantInput): Promise<Restaurant> {
  const db = getFirestore();
  const auth = getAuth();
  const now = new Date().toISOString();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc();

  const restaurant: Restaurant = {
    id: ref.id,
    name: input.name,
    ownerId: input.ownerId,
    description: input.description,
    cuisineTypes: input.cuisineTypes,
    logoUrl: null,
    coverImageUrl: null,
    address: input.address,
    operatingHours: [],
    status: "approved",
    isOpenNow: true,
    commissionRate: input.commissionRate,
    deliveryFeeOverride: null,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(restaurant);

  // Grant the owner restaurant_owner claims scoped to this restaurant.
  const ownerUserDoc = await db.collection("users").doc(input.ownerId).get();
  const existingRestaurantIds: string[] = ownerUserDoc.exists
    ? ((ownerUserDoc.data()?.["restaurantIds"] as string[] | undefined) ?? [])
    : [];
  const nextRestaurantIds = [...new Set([...existingRestaurantIds, ref.id])];

  await db.collection("users").doc(input.ownerId).set(
    { role: "restaurant_owner", restaurantIds: nextRestaurantIds, updatedAt: now },
    { merge: true },
  );
  await auth.setCustomUserClaims(input.ownerId, {
    role: "restaurant_owner",
    restaurantIds: nextRestaurantIds,
  });

  logger.info("Restaurant created", { restaurantId: ref.id, ownerId: input.ownerId });
  return restaurant;
}

export interface UpdateRestaurantInput {
  name?: string;
  description?: string;
  cuisineTypes?: string[];
  isOpenNow?: boolean;
  operatingHours?: Restaurant["operatingHours"];
  deliveryFeeOverride?: number | null;
}

export async function updateRestaurant(restaurantId: string, updates: UpdateRestaurantInput): Promise<Restaurant> {
  const db = getFirestore();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, `Restaurant ${restaurantId} not found`);

  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Restaurant;
}

/** platform_admin only — approve/suspend/reject. */
export async function updateRestaurantStatus(
  restaurantId: string,
  status: Restaurant["status"],
): Promise<Restaurant> {
  const db = getFirestore();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, `Restaurant ${restaurantId} not found`);

  await ref.update({ status, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Restaurant;
}

export async function listMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const db = getFirestore();
  const snap = await db
    .collection(RESTAURANTS_COLLECTION)
    .doc(restaurantId)
    .collection(MENU_ITEMS_SUBCOLLECTION)
    .where("isAvailable", "==", true)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MenuItem);
}

/** Owner/admin management view — includes unavailable items. */
export async function listAllMenuItemsForOwner(restaurantId: string): Promise<MenuItem[]> {
  const db = getFirestore();
  const snap = await db
    .collection(RESTAURANTS_COLLECTION)
    .doc(restaurantId)
    .collection(MENU_ITEMS_SUBCOLLECTION)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MenuItem);
}

export async function getMenuItemsByIds(
  restaurantId: string,
  menuItemIds: string[],
): Promise<Map<string, MenuItem>> {
  const db = getFirestore();
  const refs = menuItemIds.map((id) =>
    db.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(MENU_ITEMS_SUBCOLLECTION).doc(id),
  );
  if (refs.length === 0) return new Map();

  const docs = await db.getAll(...refs);
  const result = new Map<string, MenuItem>();
  for (const doc of docs) {
    if (doc.exists) {
      result.set(doc.id, { id: doc.id, ...doc.data() } as MenuItem);
    }
  }
  return result;
}

export type MenuItemInput = Pick<
  MenuItem,
  "name" | "description" | "price" | "category" | "isAvailable" | "modifiers"
> & { imageUrl?: string | null };

export async function createMenuItem(restaurantId: string, input: MenuItemInput): Promise<MenuItem> {
  const db = getFirestore();
  const now = new Date().toISOString();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(MENU_ITEMS_SUBCOLLECTION).doc();

  const menuItem: MenuItem = {
    id: ref.id,
    restaurantId,
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    imageUrl: input.imageUrl ?? null,
    isAvailable: input.isAvailable,
    modifiers: input.modifiers,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(menuItem);
  return menuItem;
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  updates: Partial<MenuItemInput>,
): Promise<MenuItem> {
  const db = getFirestore();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(MENU_ITEMS_SUBCOLLECTION).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, `Menu item ${itemId} not found`);

  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as MenuItem;
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(MENU_ITEMS_SUBCOLLECTION).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, `Menu item ${itemId} not found`);
  await ref.delete();
}
