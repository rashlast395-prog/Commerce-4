import { api } from "./client";

export interface RiderProfile {
  uid: string;
  isOnline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  locationUpdatedAt: string | null;
  activeOrderId: string | null;
  vehicleType: "bike" | "motorbike" | "car";
  ratingAvg: number;
  ratingCount: number;
}

export function getMyRiderProfile(): Promise<RiderProfile> {
  return api.get<RiderProfile>("/riders/me");
}

export function updateMyRiderStatus(updates: {
  isOnline?: boolean;
  currentLocation?: { lat: number; lng: number };
}): Promise<RiderProfile> {
  return api.patch<RiderProfile>("/riders/me", updates);
}
