import type { MenuItem, Restaurant } from "@richys-eat/shared-types";
import { api } from "./client";

export function listRestaurants(): Promise<Restaurant[]> {
  return api.get<Restaurant[]>("/restaurants");
}

export function getRestaurant(id: string): Promise<Restaurant> {
  return api.get<Restaurant>(`/restaurants/${id}`);
}

export function listMenuItems(restaurantId: string): Promise<MenuItem[]> {
  return api.get<MenuItem[]>(`/restaurants/${restaurantId}/menu-items`);
}
