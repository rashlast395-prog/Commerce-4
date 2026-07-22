import "bootstrap/dist/css/bootstrap.min.css";
import "@richys-eat/design-tokens/tokens.css";
import "./styles/theme.css";

import { bootFirebase } from "./lib/firebase";
import { getAuthState, initAuthStore, subscribeAuth, type AuthStatus } from "./state/authStore";
import { initRouter, navigate, registerRoute, setAuthCheck } from "./router/router";
import { renderLoginPage } from "./pages/loginPage";
import { renderPlatformAdminDashboard } from "./pages/platformAdminDashboard";
import { renderRestaurantOwnerDashboard } from "./pages/restaurantOwnerDashboard";
import { signOutUser } from "@richys-eat/firebase-client";

const appEl = document.querySelector<HTMLDivElement>("#app")!;

const { ok, error } = bootFirebase();

if (!ok) {
  appEl.innerHTML = `
    <div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
      <div class="text-center p-4" style="max-width:480px">
        <h1 class="h4">Configuration needed</h1>
        <p class="re-muted">${error}</p>
      </div>
    </div>
  `;
} else {
  initAuthStore();

  registerRoute({ path: "/login", render: renderLoginPage });
  registerRoute({ path: "/", render: renderDashboardRouter, requiresAuth: true });
  registerRoute({ path: "*", render: renderDashboardRouter, requiresAuth: true });

  setAuthCheck(() => getAuthState().status === "signed_in");

  let routerInitialized = false;
  let previousStatus: AuthStatus | null = null;

  subscribeAuth((state) => {
    if (state.status === "loading") {
      if (!routerInitialized) {
        appEl.innerHTML = `
          <div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
            <span class="re-muted">Loading…</span>
          </div>
        `;
      }
      return;
    }

    if (!routerInitialized) {
      initRouter(appEl);
      routerInitialized = true;
      previousStatus = state.status;
      return;
    }

    if (state.status !== previousStatus) {
      const path = window.location.pathname;
      const onAuthPage = path === "/login";
      if (state.status === "signed_out" && !onAuthPage) {
        navigate("/login");
      } else if (state.status === "signed_in" && onAuthPage) {
        navigate("/");
      }
      previousStatus = state.status;
    }
  });
}

/** Dispatches to the correct dashboard based on role, or shows an access-denied screen. */
function renderDashboardRouter(root: HTMLElement): void | (() => void) {
  const { profile, error: profileError } = getAuthState();

  if (profileError || !profile) {
    root.innerHTML = `
      <div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
        <div class="text-center p-4" style="max-width:480px">
          <h1 class="h4">Access not set up yet</h1>
          <p class="re-muted">
            Your account doesn't have an admin or restaurant-owner profile yet.
            Ask a platform admin to grant access, then sign in again.
          </p>
          <button type="button" class="btn-re-secondary mt-2" id="signout-btn">Sign out</button>
        </div>
      </div>
    `;
    root.querySelector("#signout-btn")!.addEventListener("click", () => signOutUser());
    return;
  }

  if (profile.role === "platform_admin") {
    return renderPlatformAdminDashboard(root);
  }
  if (profile.role === "restaurant_owner" || profile.role === "restaurant_staff") {
    return renderRestaurantOwnerDashboard(root);
  }

  root.innerHTML = `
    <div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
      <div class="text-center p-4" style="max-width:480px">
        <h1 class="h4">Not authorized</h1>
        <p class="re-muted">This console is for restaurant owners and platform admins only.</p>
        <button type="button" class="btn-re-secondary mt-2" id="signout-btn">Sign out</button>
      </div>
    </div>
  `;
  root.querySelector("#signout-btn")!.addEventListener("click", () => signOutUser());
}
