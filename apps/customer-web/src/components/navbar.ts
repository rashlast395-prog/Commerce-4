import { signOutUser } from "@richys-eat/firebase-client";
import type { AppUser } from "@richys-eat/shared-types";
import { cartItemCount, getCartState } from "../state/cartStore";

export function renderNavbar(container: HTMLElement, profile: AppUser | null): void {
  const count = cartItemCount(getCartState());

  container.innerHTML = `
    <nav class="re-navbar d-flex align-items-center justify-content-between px-4 py-3">
      <a href="/" data-link class="re-navbar__wordmark text-decoration-none">Richy's <span>Eat</span></a>
      <div class="d-flex align-items-center gap-4">
        <a href="/restaurants" data-link class="text-decoration-none re-muted small fw-semibold">Browse</a>
        <a href="/orders" data-link class="text-decoration-none re-muted small fw-semibold">Orders</a>
        <a href="/cart" data-link class="text-decoration-none position-relative re-muted small fw-semibold">
          Cart
          <span
            id="cart-badge-wrap"
            ${count === 0 ? "hidden" : ""}
            style="position:absolute; top:-10px; right:-16px; background:var(--re-primary); color:#fff; border-radius:999px; font-size:10px; min-width:16px; height:16px; display:flex; align-items:center; justify-content:center; padding:0 4px;"
          ><span id="cart-badge">${count}</span></span>
        </a>
        <span class="small re-muted">${profile ? escapeHtml(profile.displayName) : ""}</span>
        <button type="button" class="btn-re-secondary" id="signout-btn">Sign out</button>
      </div>
    </nav>
  `;

  container.querySelector<HTMLButtonElement>("#signout-btn")!.addEventListener("click", async () => {
    await signOutUser();
  });
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
