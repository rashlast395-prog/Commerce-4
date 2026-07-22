import { signOutUser } from "@richys-eat/firebase-client";
import type { AppUser } from "@richys-eat/shared-types";
import { mountNotificationBell } from "./notificationBell";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  restaurant_owner: "Restaurant Owner",
  restaurant_staff: "Restaurant Staff",
};

export function renderNavbar(container: HTMLElement, profile: AppUser | null): void {
  container.innerHTML = `
    <nav class="re-navbar d-flex align-items-center justify-content-between px-4 py-3">
      <span class="re-navbar__wordmark">Richy's <span>Eat</span> <span class="re-muted small fw-normal">Admin</span></span>
      <div class="d-flex align-items-center gap-3">
        <span class="small re-muted">${profile ? `${escapeHtml(profile.displayName)} · ${ROLE_LABELS[profile.role] ?? profile.role}` : ""}</span>
        <div id="notification-bell"></div>
        <button type="button" class="btn-re-secondary" id="signout-btn">Sign out</button>
      </div>
    </nav>
  `;

  if (profile) {
    mountNotificationBell(container.querySelector<HTMLElement>("#notification-bell")!);
  }

  container.querySelector<HTMLButtonElement>("#signout-btn")!.addEventListener("click", async () => {
    await signOutUser();
  });
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
