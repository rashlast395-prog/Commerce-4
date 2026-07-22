import { listMyOrders } from "../api/orders";
import { ApiClientError } from "../api/client";
import { mountAppShell } from "../components/appShell";
import { renderOrderStatusBadge } from "../components/orderStatusBadge";
import { formatPriceFromMinorUnits } from "../lib/currency";
import { navigate } from "../router/router";

export function renderOrdersListPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);

  contentEl.innerHTML = `
    <h1 class="h3 mb-4">Your orders</h1>
    <div id="orders-list" class="d-flex flex-column gap-3">
      ${Array.from({ length: 3 })
        .map(() => `<div class="re-skeleton" style="height:80px;"></div>`)
        .join("")}
    </div>
  `;

  const listEl = contentEl.querySelector<HTMLElement>("#orders-list")!;

  listMyOrders()
    .then((orders) => {
      if (orders.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-5">
            <p class="re-muted mb-3">No orders yet.</p>
            <a href="/restaurants" data-link class="btn-re-primary d-inline-block">Browse restaurants</a>
          </div>
        `;
        return;
      }

      listEl.innerHTML = "";
      for (const order of orders) {
        const row = document.createElement("div");
        row.className = "re-card re-hover-lift p-3 d-flex justify-content-between align-items-center";
        row.style.cursor = "pointer";
        row.innerHTML = `
          <div>
            <div class="fw-semibold">Order #${order.id.slice(0, 8)}</div>
            <div class="re-muted small">${new Date(order.placedAt).toLocaleString()}</div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <span class="re-numeric fw-semibold">${formatPriceFromMinorUnits(order.total)}</span>
            ${renderOrderStatusBadge(order.status)}
          </div>
        `;
        row.addEventListener("click", () => navigate(`/orders/${order.id}`));
        listEl.appendChild(row);
      }
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load your orders.";
      listEl.innerHTML = `<div class="re-error-text">${message}</div>`;
    });

  return unsubscribe;
}
