import type { AppUser, UserRole } from "@richys-eat/shared-types";
import { api } from "./client";

export function assignUserRole(uid: string, role: UserRole, restaurantIds: string[] = []): Promise<AppUser> {
  return api.patch<AppUser>(`/auth/users/${uid}/role`, { role, restaurantIds });
}
