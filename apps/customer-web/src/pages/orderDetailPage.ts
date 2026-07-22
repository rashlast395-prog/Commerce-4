import { getOrder } from "../api/orders";
import { createReview } from "../api/reviews";
import { ApiClientError } from "../api/client";
import { mountAppShell } from "../components/appShell";
import { renderOrderStatusBadge } from "../components/orderStatusBadge";
import { formatPriceFromMinorUnits } from "../lib/currency";

export function renderOrderDetailPage(root: HTMLElement, params: Record<string, string>): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  const orderId = params.id as string;

  contentEl.innerHTML = `<div class="re-skeleton" style="height:280px;"></div>`;

  getOrder(orderId)
    .then((order) => {
      contentEl.innerHTML = `
        <div class="re-card p-4" style="max-width:560px; margin:0 auto;">
          <div class="text-center mb-4">
            <div style="font-size:2rem;">🎉</div>
            <h1 class="h4 mb-1">Order placed</h1>
            <p class="re-muted mb-0">Order #${order.id.slice(0, 8)}</p>
            <div class="mt-2">${renderOrderStatusBadge(order.status)}</div>
          </div>

          <div class="d-flex flex-column gap-2 mb-3">
            ${order.items
              .map(
                (item) => `
                  <div class="d-flex justify-content-between small">
                    <span>${item.quantity}× ${escapeHtml(item.name)}</span>
                    <span class="re-numeric">${formatPriceFromMinorUnits(item.lineTotal)}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
          <hr />
          <div class="d-flex justify-content-between small">
            <span class="re-muted">Subtotal</span>
            <span class="re-numeric">${formatPriceFromMinorUnits(order.subtotal)}</span>
          </div>
          <div class="d-flex justify-content-between small mb-2">
            <span class="re-muted">Delivery fee</span>
            <span class="re-numeric">${formatPriceFromMinorUnits(order.deliveryFee)}</span>
          </div>
          <div class="d-flex justify-content-between fw-semibold">
            <span>Total</span>
            <span class="re-numeric" style="color:var(--re-primary);">${formatPriceFromMinorUnits(order.total)}</span>
          </div>

          <hr />
          <p class="re-muted small mb-0">Delivering to ${escapeHtml(order.deliveryAddress.line1)}, ${escapeHtml(order.deliveryAddress.city)}</p>
          <p class="re-muted small">Payment: ${order.paymentStatus}</p>

          ${order.status === "delivered" ? `<hr /><div id="review-section"></div>` : ""}
        </div>
      `;

      if (order.status === "delivered") {
        renderReviewForm(contentEl.querySelector<HTMLElement>("#review-section")!, order.id);
      }
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load this order.";
      contentEl.innerHTML = `<div class="re-error-text">${escapeHtml(message)}</div>`;
    });

  return unsubscribe;
}

function renderReviewForm(container: HTMLElement, orderId: string): void {
  container.innerHTML = `
    <h2 class="h6 mb-2">Rate this order</h2>
    <form id="review-form">
      <div class="d-flex gap-1 mb-2" id="star-picker">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn p-0 border-0 bg-transparent fs-4" data-star="${n}" style="color:var(--re-border);">★</button>`).join("")}
      </div>
      <input type="text" class="re-form-control w-100 mb-2" id="review-comment" placeholder="Leave a comment (optional)" />
      <div id="review-error" class="re-error-text mb-2" hidden></div>
      <button type="submit" class="btn-re-secondary" id="review-submit" disabled>Submit review</button>
      <div id="review-thanks" class="re-muted small mt-2" hidden>Thanks for the feedback! 🙌</div>
    </form>
  `;

  let selectedRating = 0;
  const stars = container.querySelectorAll<HTMLButtonElement>("[data-star]");
  const submitBtn = container.querySelector<HTMLButtonElement>("#review-submit")!;

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.star);
      stars.forEach((s) => {
        s.style.color = Number(s.dataset.star) <= selectedRating ? "var(--re-secondary)" : "var(--re-border)";
      });
      submitBtn.disabled = false;
    });
  });

  container.querySelector<HTMLFormElement>("#review-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (selectedRating === 0) return;
    const errorEl = container.querySelector<HTMLDivElement>("#review-error")!;
    errorEl.hidden = true;
    submitBtn.disabled = true;

    const comment = (container.querySelector<HTMLInputElement>("#review-comment")!).value.trim() || null;

    try {
      await createReview(orderId, selectedRating, comment);
      container.querySelector<HTMLFormElement>("#review-form")!.style.display = "none";
      container.querySelector<HTMLElement>("#review-thanks")!.hidden = false;
    } catch (err) {
      errorEl.textContent = err instanceof ApiClientError ? err.message : "Couldn't submit your review.";
      errorEl.hidden = false;
      submitBtn.disabled = false;
    }
  });
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
