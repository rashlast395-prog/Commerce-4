import type { MenuItem, Restaurant } from "@richys-eat/shared-types";
import { api } from "./client";

export function listAllRestaurantsForAdmin(): Promise<Restaurant[]> {
  return api.get<Restaurant[]>("/restaurants/admin/all");
}

export function getRestaurant(id: string): Promise<Restaurant> {
  return api.get<Restaurant>(`/restaurants/${id}`);
}

export interface CreateRestaurantInput {
  name: string;
  ownerId: string;
  description: string;
  cuisineTypes: string[];
  address: Restaurant["address"];
  commissionRate: number;
}

export function createRestaurant(input: CreateRestaurantInput): Promise<Restaurant> {
  return api.post<Restaurant>("/restaurants", input);
}

export function updateRestaurantStatus(id: string, status: Restaurant["status"]): Promise<Restaurant> {
  return api.patch<Restaurant>(`/restaurants/${id}/status`, { status });
}

export function updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant> {
  return api.patch<Restaurant>(`/restaurants/${id}`, updates);
}

export function listAllMenuItemsForOwner(restaurantId: string): Promise<MenuItem[]> {
  return api.get<MenuItem[]>(`/restaurants/${restaurantId}/menu-items/all`);
}

export type MenuItemInput = Pick<
  MenuItem,
  "name" | "description" | "price" | "category" | "isAvailable" | "modifiers"
> & { imageUrl?: string | null };

export function createMenuItem(restaurantId: string, input: MenuItemInput): Promise<MenuItem> {
  return api.post<MenuItem>(`/restaurants/${restaurantId}/menu-items`, input);
}

export function updateMenuItem(
  restaurantId: string,
  itemId: string,
  updates: Partial<MenuItemInput>,
): Promise<MenuItem> {
  return api.patch<MenuItem>(`/restaurants/${restaurantId}/menu-items/${itemId}`, updates);
}

export function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  return api.delete<void>(`/restaurants/${restaurantId}/menu-items/${itemId}`);
}
