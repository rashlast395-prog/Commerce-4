export type UserRole =
  | "customer"
  | "restaurant_owner"
  | "restaurant_staff"
  | "rider"
  | "platform_admin";

export type AuthProvider = "password" | "google.com" | "github.com";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  restaurantIds: string[];
  authProviders: AuthProvider[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  fcmTokens: string[];
}
