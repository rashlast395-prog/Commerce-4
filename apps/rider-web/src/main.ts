import "bootstrap/dist/css/bootstrap.min.css";
import "@richys-eat/design-tokens/tokens.css";
import "./styles/theme.css";

import { bootFirebase } from "./lib/firebase";
import { getAuthState, initAuthStore, subscribeAuth, type AuthStatus } from "./state/authStore";
import { initRouter, navigate, registerRoute, setAuthCheck } from "./router/router";
import { renderLoginPage } from "./pages/loginPage";
import { renderRiderDashboard } from "./pages/riderDashboard";
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
  registerRoute({ path: "/", render: renderHomeRouter, requiresAuth: true });
  registerRoute({ path: "*", render: renderHomeRouter, requiresAuth: true });

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

function renderHomeRouter(root: HTMLElement): void | (() => void) {
  const { profile, error: profileError } = getAuthState();

  if (profileError || !profile || profile.role !== "rider") {
    root.innerHTML = `
      <div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
        <div class="text-center p-4" style="max-width:480px">
          <h1 class="h4">Not authorized</h1>
          <p class="re-muted">This app is for rider accounts only. Ask a platform admin to grant rider access.</p>
          <button type="button" class="btn-re-secondary mt-2" id="signout-btn">Sign out</button>
        </div>
      </div>
    `;
    root.querySelector("#signout-btn")!.addEventListener("click", () => signOutUser());
    return;
  }

  return renderRiderDashboard(root);
}
