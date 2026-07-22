import type { Order, OrderStatus } from "@richys-eat/shared-types";
import { mountAppShell } from "../components/appShell";
import { getMyRiderProfile, updateMyRiderStatus, type RiderProfile } from "../api/riders";
import { acceptOrder, getActiveOrder, listAvailableOrders, updateOrderStatus } from "../api/orders";
import { ApiClientError } from "../api/client";
import { formatPriceFromMinorUnits } from "../lib/currency";
import { renderOrderStatusBadge } from "../components/orderStatusBadge";

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  rider_assigned: { label: "Picked up", next: "picked_up" },
  picked_up: { label: "Out for delivery", next: "out_for_delivery" },
  out_for_delivery: { label: "Delivered", next: "delivered" },
};

export function renderRiderDashboard(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);

  contentEl.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h3 mb-0">Rider dashboard</h1>
      <div class="d-flex align-items-center gap-2">
        <span class="re-muted small" id="online-label">Checking status…</span>
        <button type="button" class="btn-re-secondary" id="online-toggle" disabled>…</button>
      </div>
    </div>
    <div id="dashboard-body"></div>
  `;

  const bodyEl = contentEl.querySelector<HTMLElement>("#dashboard-body")!;
  const onlineLabel = contentEl.querySelector<HTMLElement>("#online-label")!;
  const onlineToggle = contentEl.querySelector<HTMLButtonElement>("#online-toggle")!;

  let currentProfile: RiderProfile | null = null;

  function refreshOnlineUi(): void {
    if (!currentProfile) return;
    onlineLabel.textContent = currentProfile.isOnline ? "You're online" : "You're offline";
    onlineToggle.textContent = currentProfile.isOnline ? "Go offline" : "Go online";
    onlineToggle.disabled = false;
  }

  function loadBody(): void {
    getActiveOrder()
      .then((active) => {
        if (active) {
          renderActiveOrder(bodyEl, active, loadBody);
        } else {
          renderAvailableOrders(bodyEl, loadBody);
        }
      })
      .catch((err) => {
        const message = err instanceof ApiClientError ? err.message : "Couldn't load your dashboard.";
        bodyEl.innerHTML = `<div class="re-error-text">${message}</div>`;
      });
  }

  getMyRiderProfile()
    .then((profile) => {
      currentProfile = profile;
      refreshOnlineUi();
      loadBody();
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load your rider profile.";
      bodyEl.innerHTML = `<div class="re-error-text">${message}</div>`;
    });

  onlineToggle.addEventListener("click", async () => {
    if (!currentProfile) return;
    onlineToggle.disabled = true;
    try {
      currentProfile = await updateMyRiderStatus({ isOnline: !currentProfile.isOnline });
      refreshOnlineUi();
      loadBody();
    } catch (err) {
      window.alert(err instanceof ApiClientError ? err.message : "Couldn't update status.");
      onlineToggle.disabled = false;
    }
  });

  return unsubscribe;
}

function renderAvailableOrders(container: HTMLElement, onChange: () => void): void {
  container.innerHTML = `<div class="re-skeleton" style="height:80px;"></div>`;

  listAvailableOrders()
    .then((orders) => {
      if (orders.length === 0) {
        container.innerHTML = `<p class="re-muted">No deliveries waiting for pickup right now — check back soon.</p>`;
        return;
      }
      container.innerHTML = `<h2 class="h6 mb-3">Available deliveries</h2>`;
      const list = document.createElement("div");
      list.className = "d-flex flex-column gap-2";

      for (const order of orders) {
        const row = document.createElement("div");
        row.className = "re-row d-flex justify-content-between align-items-center";
        row.innerHTML = `
          <div>
            <div class="fw-semibold">Order #${order.id.slice(0, 8)}</div>
            <div class="re-muted small">${escapeHtml(order.deliveryAddress.line1)}, ${escapeHtml(order.deliveryAddress.city)} · <span class="re-numeric">${formatPriceFromMinorUnits(order.total)}</span></div>
          </div>
          <button type="button" class="btn-re-primary" data-action="accept">Accept</button>
        `;
        row.querySelector('[data-action="accept"]')!.addEventListener("click", async (e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.disabled = true;
          btn.textContent = "Accepting…";
          try {
            await acceptOrder(order.id);
            onChange();
          } catch (err) {
            window.alert(err instanceof ApiClientError ? err.message : "Couldn't accept this order — it may already be taken.");
            btn.disabled = false;
            btn.textContent = "Accept";
          }
        });
        list.appendChild(row);
      }
      container.appendChild(list);
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load available deliveries.";
      container.innerHTML = `<div class="re-error-text">${message}</div>`;
    });
}

function renderActiveOrder(container: HTMLElement, order: Order, onChange: () => void): void {
  const action = NEXT_STATUS[order.status];

  container.innerHTML = `
    <div class="re-card p-4" style="max-width:520px;">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <h2 class="h5 mb-0">Order #${order.id.slice(0, 8)}</h2>
        ${renderOrderStatusBadge(order.status)}
      </div>
      <p class="re-muted mb-1">Deliver to</p>
      <p class="mb-3">${escapeHtml(order.deliveryAddress.line1)}, ${escapeHtml(order.deliveryAddress.city)}</p>
      <div class="d-flex flex-column gap-1 mb-3">
        ${order.items.map((item) => `<div class="d-flex justify-content-between small"><span>${item.quantity}× ${escapeHtml(item.name)}</span></div>`).join("")}
      </div>
      <hr />
      <div class="d-flex justify-content-between fw-semibold mb-3">
        <span>Total</span>
        <span class="re-numeric">${formatPriceFromMinorUnits(order.total)}</span>
      </div>
      ${action ? `<button type="button" class="btn-re-primary w-100" id="advance-btn">${action.label}</button>` : `<p class="re-muted small mb-0">Waiting on the restaurant to mark this ready for pickup.</p>`}
    </div>
  `;

  if (action) {
    container.querySelector<HTMLButtonElement>("#advance-btn")!.addEventListener("click", async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      try {
        await updateOrderStatus(order.id, action.next);
        onChange();
      } catch (err) {
        window.alert(err instanceof ApiClientError ? err.message : "Couldn't update order status.");
        btn.disabled = false;
      }
    });
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
