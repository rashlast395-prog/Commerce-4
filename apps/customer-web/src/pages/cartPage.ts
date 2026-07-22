import { mountAppShell } from "../components/appShell";
import { cartSubtotal, getCartState, subscribeCart, updateQuantity, type CartLine } from "../state/cartStore";
import { formatPriceFromMinorUnits } from "../lib/currency";
import { navigate } from "../router/router";

export function renderCartPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe: unsubAuth } = mountAppShell(root);

  contentEl.innerHTML = `<h1 class="h3 mb-4">Your cart</h1><div id="cart-body"></div>`;
  const bodyEl = contentEl.querySelector<HTMLElement>("#cart-body")!;

  const unsubCart = subscribeCart((state) => {
    if (state.lines.length === 0) {
      bodyEl.innerHTML = `
        <div class="text-center py-5">
          <p class="re-muted mb-3">Your cart is empty.</p>
          <a href="/restaurants" data-link class="btn-re-primary d-inline-block">Browse restaurants</a>
        </div>
      `;
      return;
    }

    bodyEl.innerHTML = `
      <p class="re-muted mb-3">Ordering from <strong>${escapeHtml(state.restaurantName ?? "")}</strong></p>
      <div id="cart-lines" class="d-flex flex-column gap-3 mb-4"></div>
      <div class="d-flex justify-content-between align-items-center re-card p-3 mb-4">
        <span class="fw-semibold">Subtotal</span>
        <span class="re-numeric fw-semibold" style="color:var(--re-primary);">${formatPriceFromMinorUnits(cartSubtotal(state))}</span>
      </div>
      <button type="button" class="btn-re-primary w-100" id="checkout-btn">Proceed to checkout</button>
    `;

    const linesEl = bodyEl.querySelector<HTMLElement>("#cart-lines")!;
    for (const line of state.lines) {
      linesEl.appendChild(renderCartLine(line));
    }

    bodyEl.querySelector<HTMLButtonElement>("#checkout-btn")!.addEventListener("click", () => {
      navigate("/checkout");
    });
  });

  return () => {
    unsubAuth();
    unsubCart();
  };
}

function renderCartLine(line: CartLine): HTMLElement {
  const el = document.createElement("div");
  el.className = "re-card p-3 d-flex align-items-center gap-3";

  const modifiersLabel = line.selectedModifiers.map((m) => `${m.name}: ${m.option}`).join(", ");

  el.innerHTML = `
    <img src="${line.imageUrl}" alt="" style="width:64px; height:64px; object-fit:cover; border-radius:var(--re-radius-md);" />
    <div class="flex-grow-1">
      <div class="fw-semibold">${escapeHtml(line.name)}</div>
      ${modifiersLabel ? `<div class="re-muted small">${escapeHtml(modifiersLabel)}</div>` : ""}
      <div class="re-numeric small" style="color:var(--re-primary);">${formatPriceFromMinorUnits(line.unitPriceMinorUnits)}</div>
    </div>
    <div class="d-flex align-items-center gap-2">
      <button type="button" class="btn-re-secondary" style="padding:0.35rem 0.7rem;" data-action="dec">−</button>
      <span class="re-numeric" style="min-width:1.5rem; text-align:center;">${line.quantity}</span>
      <button type="button" class="btn-re-secondary" style="padding:0.35rem 0.7rem;" data-action="inc">+</button>
    </div>
  `;

  el.querySelector('[data-action="inc"]')!.addEventListener("click", () => {
    updateQuantity(line.menuItemId, line.selectedModifiers, line.quantity + 1);
  });
  el.querySelector('[data-action="dec"]')!.addEventListener("click", () => {
    updateQuantity(line.menuItemId, line.selectedModifiers, line.quantity - 1);
  });

  return el;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
