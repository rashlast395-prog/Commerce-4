import type { MenuItem, Order, OrderStatus, Restaurant } from "@richys-eat/shared-types";
import { mountAppShell } from "../components/appShell";
import { getAuthState } from "../state/authStore";
import {
  createMenuItem,
  deleteMenuItem,
  getRestaurant,
  listAllMenuItemsForOwner,
  updateMenuItem,
  updateRestaurant,
} from "../api/restaurants";
import { listOrdersForRestaurant, updateOrderStatus } from "../api/orders";
import { ApiClientError } from "../api/client";
import { formatPriceFromMinorUnits } from "../lib/currency";
import { renderOrderStatusBadge } from "../components/orderStatusBadge";

type Tab = "orders" | "menu" | "settings";

const NEXT_ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }[]>> = {
  payment_confirmed: [{ label: "Accept", next: "accepted_by_restaurant" }, { label: "Reject", next: "rejected" }],
  accepted_by_restaurant: [{ label: "Start preparing", next: "preparing" }],
  preparing: [{ label: "Mark ready for pickup", next: "ready_for_pickup" }],
};

export function renderRestaurantOwnerDashboard(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  const profile = getAuthState().profile;
  const restaurantId = profile?.restaurantIds[0];

  if (!restaurantId) {
    contentEl.innerHTML = `<p class="re-muted">Your account isn't linked to a restaurant yet — contact a platform admin.</p>`;
    return unsubscribe;
  }

  contentEl.innerHTML = `
    <h1 class="h3 mb-4">Restaurant dashboard</h1>
    <div class="re-tabs" role="tablist">
      <button type="button" class="re-tab" data-tab="orders" role="tab" aria-selected="true">Orders</button>
      <button type="button" class="re-tab" data-tab="menu" role="tab" aria-selected="false">Menu</button>
      <button type="button" class="re-tab" data-tab="settings" role="tab" aria-selected="false">Settings</button>
    </div>
    <div id="tab-content"></div>
  `;

  const tabContentEl = contentEl.querySelector<HTMLElement>("#tab-content")!;
  const tabButtons = contentEl.querySelectorAll<HTMLButtonElement>(".re-tab");

  function showTab(tab: Tab): void {
    tabButtons.forEach((btn) => btn.setAttribute("aria-selected", String(btn.dataset.tab === tab)));
    if (tab === "orders") renderOrdersTab(tabContentEl, restaurantId as string);
    if (tab === "menu") renderMenuTab(tabContentEl, restaurantId as string);
    if (tab === "settings") renderSettingsTab(tabContentEl, restaurantId as string);
  }

  tabButtons.forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.tab as Tab)));
  showTab("orders");

  return unsubscribe;
}

function renderOrdersTab(container: HTMLElement, restaurantId: string): void {
  container.innerHTML = `<div class="re-skeleton" style="height:60px;"></div>`;

  function load(): void {
    listOrdersForRestaurant(restaurantId)
      .then((orders) => renderOrdersList(container, orders, load))
      .catch((err) => {
        const message = err instanceof ApiClientError ? err.message : "Couldn't load orders.";
        container.innerHTML = `<div class="re-error-text">${message}</div>`;
      });
  }
  load();
}

function renderOrdersList(container: HTMLElement, orders: Order[], onChange: () => void): void {
  if (orders.length === 0) {
    container.innerHTML = `<p class="re-muted">No orders yet.</p>`;
    return;
  }

  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "d-flex flex-column gap-2";

  for (const order of orders) {
    const row = document.createElement("div");
    row.className = "re-row d-flex justify-content-between align-items-center";
    const actions = NEXT_ACTIONS[order.status] ?? [];

    row.innerHTML = `
      <div>
        <div class="fw-semibold">Order #${order.id.slice(0, 8)} — ${order.items.length} item${order.items.length === 1 ? "" : "s"}</div>
        <div class="re-muted small">${new Date(order.placedAt).toLocaleString()} · <span class="re-numeric">${formatPriceFromMinorUnits(order.total)}</span></div>
      </div>
      <div class="d-flex align-items-center gap-2">
        ${renderOrderStatusBadge(order.status)}
        <div data-role="actions"></div>
      </div>
    `;

    const actionsEl = row.querySelector<HTMLElement>('[data-role="actions"]')!;
    for (const action of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-re-secondary";
      btn.textContent = action.label;
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await updateOrderStatus(order.id, action.next);
          onChange();
        } catch (err) {
          window.alert(err instanceof ApiClientError ? err.message : "Couldn't update order status.");
          btn.disabled = false;
        }
      });
      actionsEl.appendChild(btn);
    }

    list.appendChild(row);
  }

  container.appendChild(list);
}

function renderMenuTab(container: HTMLElement, restaurantId: string): void {
  container.innerHTML = `<div class="re-skeleton" style="height:60px;"></div>`;

  function load(): void {
    listAllMenuItemsForOwner(restaurantId)
      .then((items) => renderMenuManager(container, restaurantId, items, load))
      .catch((err) => {
        const message = err instanceof ApiClientError ? err.message : "Couldn't load menu.";
        container.innerHTML = `<div class="re-error-text">${message}</div>`;
      });
  }
  load();
}

function renderMenuManager(
  container: HTMLElement,
  restaurantId: string,
  items: MenuItem[],
  onChange: () => void,
): void {
  container.innerHTML = `
    <form id="new-item-form" class="re-row mb-4">
      <h3 class="h6 mb-3">Add menu item</h3>
      <div class="row g-3">
        <div class="col-md-4"><label class="re-label">Name</label><input class="re-form-control w-100" id="iname" required /></div>
        <div class="col-md-3"><label class="re-label">Category</label><input class="re-form-control w-100" id="icategory" required /></div>
        <div class="col-md-2"><label class="re-label">Price (GHS)</label><input type="number" step="0.01" min="0" class="re-form-control w-100" id="iprice" required /></div>
        <div class="col-md-3"><label class="re-label">Description</label><input class="re-form-control w-100" id="idesc" /></div>
      </div>
      <p class="re-muted small mt-2 mb-0">Modifiers (e.g. protein choices) can be added via a follow-up editor — items created here start with none.</p>
      <button type="submit" class="btn-re-primary mt-3">Add item</button>
    </form>
    <div id="menu-items-list" class="d-flex flex-column gap-2"></div>
  `;

  const listEl = container.querySelector<HTMLElement>("#menu-items-list")!;
  if (items.length === 0) {
    listEl.innerHTML = `<p class="re-muted">No menu items yet — add one above.</p>`;
  } else {
    for (const item of items) {
      listEl.appendChild(renderMenuItemRow(restaurantId, item, onChange));
    }
  }

  container.querySelector<HTMLFormElement>("#new-item-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (container.querySelector<HTMLInputElement>("#iname")!).value.trim();
    const category = (container.querySelector<HTMLInputElement>("#icategory")!).value.trim();
    const priceGHS = Number((container.querySelector<HTMLInputElement>("#iprice")!).value);
    const description = (container.querySelector<HTMLInputElement>("#idesc")!).value.trim();

    try {
      await createMenuItem(restaurantId, {
        name,
        category,
        description,
        price: Math.round(priceGHS * 100),
        isAvailable: true,
        modifiers: [],
      });
      onChange();
    } catch (err) {
      window.alert(err instanceof ApiClientError ? err.message : "Couldn't add item.");
    }
  });
}

function renderMenuItemRow(restaurantId: string, item: MenuItem, onChange: () => void): HTMLElement {
  const row = document.createElement("div");
  row.className = "re-row d-flex justify-content-between align-items-center";
  row.innerHTML = `
    <div>
      <div class="fw-semibold">${escapeHtml(item.name)} <span class="re-badge re-badge-accent">${escapeHtml(item.category)}</span></div>
      <div class="re-muted small">${escapeHtml(item.description)}</div>
    </div>
    <div class="d-flex align-items-center gap-2">
      <span class="re-numeric fw-semibold" style="color:var(--re-primary);">${formatPriceFromMinorUnits(item.price)}</span>
      <button type="button" class="btn-re-secondary" data-action="toggle">${item.isAvailable ? "Mark unavailable" : "Mark available"}</button>
      <button type="button" class="btn-re-secondary" data-action="delete">Delete</button>
    </div>
  `;

  row.querySelector('[data-action="toggle"]')!.addEventListener("click", async () => {
    try {
      await updateMenuItem(restaurantId, item.id, { isAvailable: !item.isAvailable });
      onChange();
    } catch (err) {
      window.alert(err instanceof ApiClientError ? err.message : "Couldn't update item.");
    }
  });
  row.querySelector('[data-action="delete"]')!.addEventListener("click", async () => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMenuItem(restaurantId, item.id);
      onChange();
    } catch (err) {
      window.alert(err instanceof ApiClientError ? err.message : "Couldn't delete item.");
    }
  });

  return row;
}

function renderSettingsTab(container: HTMLElement, restaurantId: string): void {
  container.innerHTML = `<div class="re-skeleton" style="height:200px;"></div>`;

  getRestaurant(restaurantId)
    .then((restaurant) => {
      container.innerHTML = `
        <form id="settings-form" class="re-row" style="max-width:520px;">
          <div class="mb-3">
            <label class="re-label">Name</label>
            <input class="re-form-control w-100" id="sname" value="${escapeAttr(restaurant.name)}" required />
          </div>
          <div class="mb-3">
            <label class="re-label">Description</label>
            <input class="re-form-control w-100" id="sdesc" value="${escapeAttr(restaurant.description)}" />
          </div>
          <div class="form-check mb-3">
            <input type="checkbox" class="form-check-input" id="sopen" ${restaurant.isOpenNow ? "checked" : ""} />
            <label class="form-check-label re-label" for="sopen">Currently open for orders</label>
          </div>
          <div id="settings-error" class="re-error-text mb-3" hidden></div>
          <button type="submit" class="btn-re-primary">Save changes</button>
        </form>
      `;

      const form = container.querySelector<HTMLFormElement>("#settings-form")!;
      const errorEl = container.querySelector<HTMLDivElement>("#settings-error")!;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.hidden = true;
        try {
          await updateRestaurant(restaurantId, {
            name: (container.querySelector<HTMLInputElement>("#sname")!).value.trim(),
            description: (container.querySelector<HTMLInputElement>("#sdesc")!).value.trim(),
            isOpenNow: (container.querySelector<HTMLInputElement>("#sopen")!).checked,
          } as Partial<Restaurant>);
        } catch (err) {
          errorEl.textContent = err instanceof ApiClientError ? err.message : "Couldn't save changes.";
          errorEl.hidden = false;
        }
      });
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load restaurant settings.";
      container.innerHTML = `<div class="re-error-text">${message}</div>`;
    });
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}
