import "bootstrap/dist/css/bootstrap.min.css";
import "@richys-eat/design-tokens/tokens.css";
import "./styles/theme.css";

import { bootFirebase } from "./lib/firebase";
import { getAuthState, initAuthStore, subscribeAuth, type AuthStatus } from "./state/authStore";
import { initRouter, navigate, registerRoute, setAuthCheck } from "./router/router";
import { renderLoginPage } from "./pages/loginPage";
import { renderRegisterPage } from "./pages/registerPage";
import { renderHomePage } from "./pages/homePage";
import { renderRestaurantsPage } from "./pages/restaurantsPage";
import { renderRestaurantDetailPage } from "./pages/restaurantDetailPage";
import { renderCartPage } from "./pages/cartPage";
import { renderCheckoutPage } from "./pages/checkoutPage";
import { renderOrdersListPage } from "./pages/ordersListPage";
import { renderOrderDetailPage } from "./pages/orderDetailPage";
import { cartItemCount, subscribeCart } from "./state/cartStore";

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
  registerRoute({ path: "/register", render: renderRegisterPage });
  registerRoute({ path: "/", render: renderHomePage, requiresAuth: true });
  registerRoute({ path: "/restaurants", render: renderRestaurantsPage, requiresAuth: true });
  registerRoute({ path: "/restaurants/:id", render: renderRestaurantDetailPage, requiresAuth: true });
  registerRoute({ path: "/cart", render: renderCartPage, requiresAuth: true });
  registerRoute({ path: "/checkout", render: renderCheckoutPage, requiresAuth: true });
  registerRoute({ path: "/orders", render: renderOrdersListPage, requiresAuth: true });
  registerRoute({ path: "/orders/:id", render: renderOrderDetailPage, requiresAuth: true });
  registerRoute({ path: "*", render: renderHomePage, requiresAuth: true });

  setAuthCheck(() => getAuthState().status === "signed_in");

  // Keeps the navbar's cart badge live even when the navbar itself hasn't
  // re-rendered (e.g. adding items while staying on a restaurant page).
  subscribeCart((state) => {
    const badge = document.getElementById("cart-badge");
    const wrap = document.getElementById("cart-badge-wrap");
    const count = cartItemCount(state);
    if (badge) badge.textContent = String(count);
    if (wrap) wrap.hidden = count === 0;
  });

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
      initRouter(appEl); // first real render; router's requiresAuth + isSignedIn() route it correctly
      routerInitialized = true;
      previousStatus = state.status;
      return;
    }

    if (state.status !== previousStatus) {
      const path = window.location.pathname;
      const onAuthPage = path === "/login" || path === "/register";
      if (state.status === "signed_out" && !onAuthPage) {
        navigate("/login");
      } else if (state.status === "signed_in" && onAuthPage) {
        navigate("/");
      }
      previousStatus = state.status;
    }
  });
}
