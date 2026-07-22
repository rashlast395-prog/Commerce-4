import type { AppUser, AuthProvider, UserRole } from "@richys-eat/shared-types";
import { getAuth, getFirestore } from "../config/firebase.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";

const USERS_COLLECTION = "users";

/**
 * Ensures a Firestore users/{uid} document exists for a freshly signed-up
 * (or first-time) Firebase Auth user, and that they have a default role
 * custom claim. Idempotent — safe to call on every login.
 */
export async function bootstrapUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  phone: string | null;
  providerIds: string[];
}): Promise<AppUser> {
  const db = getFirestore();
  const auth = getAuth();
  const ref = db.collection(USERS_COLLECTION).doc(params.uid);
  const existing = await ref.get();

  if (existing.exists) {
    return existing.data() as AppUser;
  }

  const now = new Date().toISOString();
  const authProviders = params.providerIds.filter((p): p is AuthProvider =>
    ["password", "google.com", "github.com"].includes(p),
  );

  const newUser: AppUser = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    phone: params.phone,
    role: "customer",
    restaurantIds: [],
    authProviders,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    fcmTokens: [],
  };

  await ref.set(newUser);

  // Default role claim so requireRole() middleware works immediately.
  await auth.setCustomUserClaims(params.uid, { role: "customer", restaurantIds: [] });

  logger.info("Bootstrapped new user profile", { uid: params.uid, role: "customer" });
  return newUser;
}

export async function getUserProfile(uid: string): Promise<AppUser> {
  const db = getFirestore();
  const snap = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!snap.exists) {
    throw new ApiError(404, `User profile not found for uid ${uid}`);
  }
  return snap.data() as AppUser;
}

/**
 * platform_admin-only: promotes/reassigns a user's role and, for restaurant
 * roles, which restaurant(s) they're scoped to. Updates both the Firestore
 * doc (for reads) and the Auth custom claim (for security rules + backend
 * middleware) so they never drift apart.
 */
export async function assignUserRole(params: {
  uid: string;
  role: UserRole;
  restaurantIds: string[];
}): Promise<AppUser> {
  const db = getFirestore();
  const auth = getAuth();
  const ref = db.collection(USERS_COLLECTION).doc(params.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new ApiError(404, `User profile not found for uid ${params.uid}`);
  }

  await ref.update({
    role: params.role,
    restaurantIds: params.restaurantIds,
    updatedAt: new Date().toISOString(),
  });

  await auth.setCustomUserClaims(params.uid, {
    role: params.role,
    restaurantIds: params.restaurantIds,
  });

  logger.info("Assigned user role", { uid: params.uid, role: params.role });
  return { ...(snap.data() as AppUser), role: params.role, restaurantIds: params.restaurantIds };
}
