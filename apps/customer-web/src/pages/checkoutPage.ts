import { mountAppShell } from "../components/appShell";
import { cartSubtotal, clearCart, getCartState } from "../state/cartStore";
import { formatPriceFromMinorUnits } from "../lib/currency";
import { createOrder } from "../api/orders";
import { initializePayment, mockCompletePayment } from "../api/payments";
import { ApiClientError } from "../api/client";
import { navigate } from "../router/router";

export function renderCheckoutPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  const cart = getCartState();

  if (cart.lines.length === 0) {
    contentEl.innerHTML = `
      <div class="text-center py-5">
        <p class="re-muted mb-3">Your cart is empty.</p>
        <a href="/restaurants" data-link class="btn-re-primary d-inline-block">Browse restaurants</a>
      </div>
    `;
    return unsubscribe;
  }

  contentEl.innerHTML = `
    <h1 class="h3 mb-4">Checkout</h1>
    <div class="row g-4">
      <div class="col-12 col-md-7">
        <form id="checkout-form" novalidate>
          <div class="mb-3">
            <label for="line1" class="re-label">Delivery address</label>
            <input type="text" class="re-form-control w-100" id="line1" required placeholder="House number, street" />
          </div>
          <div class="mb-3">
            <label for="city" class="re-label">City</label>
            <input type="text" class="re-form-control w-100" id="city" required value="Accra" />
          </div>
          <p class="re-muted small">
            Precise location picking (map pin) is a future enhancement — using approximate
            Accra coordinates for now so checkout is fully functional end to end.
          </p>
          <div class="mb-3">
            <label class="re-label d-block">Payment method</label>
            <div class="d-flex gap-3">
              <label class="d-flex align-items-center gap-2">
                <input type="radio" name="provider" value="paystack" checked /> Paystack
              </label>
              <label class="d-flex align-items-center gap-2">
                <input type="radio" name="provider" value="flutterwave" /> Flutterwave
              </label>
            </div>
          </div>
          <div id="checkout-error" class="re-error-text mb-3" hidden></div>
          <div id="checkout-status" class="re-muted small mb-3" hidden></div>
          <button type="submit" class="btn-re-primary w-100" id="place-order-btn">Place order</button>
        </form>
      </div>
      <div class="col-12 col-md-5">
        <div class="re-card p-3">
          <h2 class="h6 mb-3">Order summary</h2>
          <div class="d-flex flex-column gap-2 mb-3">
            ${cart.lines
              .map(
                (line) => `
                  <div class="d-flex justify-content-between small">
                    <span>${line.quantity}× ${escapeHtml(line.name)}</span>
                    <span class="re-numeric">${formatPriceFromMinorUnits(line.unitPriceMinorUnits * line.quantity)}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
          <hr />
          <div class="d-flex justify-content-between fw-semibold">
            <span>Subtotal</span>
            <span class="re-numeric">${formatPriceFromMinorUnits(cartSubtotal(cart))}</span>
          </div>
          <p class="re-muted small mt-2 mb-0">Delivery fee is calculated when your order is placed.</p>
        </div>
      </div>
    </div>
  `;

  const errorEl = contentEl.querySelector<HTMLDivElement>("#checkout-error")!;
  const statusEl = contentEl.querySelector<HTMLDivElement>("#checkout-status")!;
  const form = contentEl.querySelector<HTMLFormElement>("#checkout-form")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    statusEl.hidden = true;

    const line1 = contentEl.querySelector<HTMLInputElement>("#line1")!.value.trim();
    const city = contentEl.querySelector<HTMLInputElement>("#city")!.value.trim();
    const provider = (contentEl.querySelector<HTMLInputElement>('input[name="provider"]:checked')!)
      .value as "paystack" | "flutterwave";
    if (!line1) {
      errorEl.textContent = "Enter a delivery address.";
      errorEl.hidden = false;
      return;
    }

    const submitBtn = contentEl.querySelector<HTMLButtonElement>("#place-order-btn")!;
    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order…";

    try {
      const order = await createOrder({
        restaurantId: cart.restaurantId as string,
        items: cart.lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          selectedModifiers: line.selectedModifiers.map((m) => ({ name: m.name, option: m.option })),
        })),
        deliveryAddress: {
          line1,
          city,
          // Approximate Accra coordinates — real map picker is a follow-up (see ASSUMPTIONS.md).
          geopoint: { lat: 5.6037, lng: -0.187 },
        },
      });

      clearCart();
      submitBtn.textContent = "Processing payment…";
      statusEl.hidden = false;
      statusEl.textContent = `Starting payment with ${provider}…`;

      const payment = await initializePayment(order.id, provider);

      if (payment.checkoutUrl) {
        // Real gateway configured — hand off to their hosted checkout page.
        statusEl.textContent = "Redirecting to secure payment…";
        window.location.href = payment.checkoutUrl;
        return;
      }

      // Dev mode: no live gateway credentials configured on the backend.
      // Simulate a successful webhook so the order flow can still be
      // exercised end to end (see docs/ASSUMPTIONS.md).
      statusEl.textContent = "No live payment gateway configured — simulating a successful payment for testing…";
      await mockCompletePayment(payment.paymentId);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Couldn't complete checkout. Try again.";
      errorEl.textContent = message;
      errorEl.hidden = false;
      statusEl.hidden = true;
      submitBtn.disabled = false;
      submitBtn.textContent = "Place order";
    }
  });

  return unsubscribe;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
