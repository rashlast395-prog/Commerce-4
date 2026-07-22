export type RestaurantStatus = "pending" | "approved" | "suspended" | "rejected";

export interface OperatingHours {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string; // "09:00"
  close: string; // "21:00"
  isClosed: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RestaurantAddress {
  line1: string;
  city: string;
  region: string;
  geopoint: GeoPoint;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerId: string;
  description: string;
  cuisineTypes: string[];
  logoUrl: string | null;
  coverImageUrl: string | null;
  address: RestaurantAddress;
  operatingHours: OperatingHours[];
  status: RestaurantStatus;
  isOpenNow: boolean;
  commissionRate: number;
  /** Overrides the platform default flat delivery fee when set (minor units). Null = use platform default. */
  deliveryFeeOverride: number | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemModifierOption {
  label: string;
  priceDelta: number;
}

export interface MenuItemModifier {
  name: string;
  options: MenuItemModifierOption[];
  required: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number; // minor units (pesewas)
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
  modifiers: MenuItemModifier[];
  createdAt: string;
  updatedAt: string;
}
