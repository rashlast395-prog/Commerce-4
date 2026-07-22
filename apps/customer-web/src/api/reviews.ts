import { api } from "./client";

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

export function createReview(orderId: string, rating: number, comment: string | null): Promise<Review> {
  return api.post<Review>("/reviews", { orderId, rating, comment });
}
