import { getFirestore } from "../config/firebase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getOrderById } from "./orderService.js";

export interface Review {
  id: string;
  restaurantId: string;
  customerId: string;
  orderId: string | null;
  riderId: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

const REVIEWS_COLLECTION = "reviews";
const RESTAURANTS_COLLECTION = "restaurants";

export async function createReview(
  customerId: string,
  input: { orderId: string; rating: number; comment: string | null },
): Promise<Review> {
  const order = await getOrderById(input.orderId);
  if (order.customerId !== customerId) {
    throw new ApiError(403, "You can only review your own orders");
  }
  if (order.status !== "delivered") {
    throw new ApiError(409, "You can only review orders that have been delivered");
  }

  const db = getFirestore();
  const existing = await db
    .collection(REVIEWS_COLLECTION)
    .where("orderId", "==", input.orderId)
    .where("customerId", "==", customerId)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new ApiError(409, "You've already reviewed this order");
  }

  const ref = db.collection(REVIEWS_COLLECTION).doc();
  const review: Review = {
    id: ref.id,
    restaurantId: order.restaurantId,
    customerId,
    orderId: input.orderId,
    riderId: order.riderId,
    rating: input.rating,
    comment: input.comment,
    createdAt: new Date().toISOString(),
  };
  await ref.set(review);

  // Roll the new rating into the restaurant's running average.
  const restaurantRef = db.collection(RESTAURANTS_COLLECTION).doc(order.restaurantId);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(restaurantRef);
    if (!doc.exists) return;
    const data = doc.data() as { ratingAvg: number; ratingCount: number };
    const newCount = data.ratingCount + 1;
    const newAvg = (data.ratingAvg * data.ratingCount + input.rating) / newCount;
    tx.update(restaurantRef, { ratingAvg: newAvg, ratingCount: newCount });
  });

  return review;
}

export async function listReviewsForRestaurant(restaurantId: string): Promise<Review[]> {
  const db = getFirestore();
  const snap = await db
    .collection(REVIEWS_COLLECTION)
    .where("restaurantId", "==", restaurantId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as Review);
}
