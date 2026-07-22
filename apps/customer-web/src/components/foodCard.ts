import { formatPriceFromMinorUnits } from "../lib/currency";

export interface FoodCardViewModel {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceMinorUnits: number;
  rating: number;
  ratingCount: number;
  category: string;
}

export interface FoodCardCallbacks {
  onToggleFavorite?: (id: string, nextFavorite: boolean) => void;
  onAddToCart?: (id: string) => void;
}

/**
 * Presentation-only for now — favorite/add-to-cart are local UI state.
 * Phase 2 wires onAddToCart to a real cart store, Phase 6 wires
 * onToggleFavorite to a persisted wishlist collection.
 */
export function renderFoodCard(item: FoodCardViewModel, callbacks: FoodCardCallbacks = {}): HTMLElement {
  const card = document.createElement("article");
  card.className = "re-food-card re-hover-lift re-animate-slide-up";

  card.innerHTML = `
    <div class="re-food-card__image-wrap">
      <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />
      <button
        type="button"
        class="re-food-card__favorite"
        aria-pressed="false"
        aria-label="Save ${escapeHtml(item.name)} to favorites"
      >♥</button>
    </div>
    <div class="re-food-card__body">
      <span class="re-badge re-badge-accent">${escapeHtml(item.category)}</span>
      <div class="re-food-card__top-row">
        <h3 class="re-food-card__name">${escapeHtml(item.name)}</h3>
        <span class="re-food-card__price re-numeric">${formatPriceFromMinorUnits(item.priceMinorUnits)}</span>
      </div>
      <div class="re-food-card__rating">
        <span class="re-star" aria-hidden="true">★</span>
        <span>${item.rating.toFixed(1)}</span>
        <span class="re-muted">(${item.ratingCount})</span>
      </div>
      <p class="re-food-card__description">${escapeHtml(item.description)}</p>
      <div class="re-food-card__footer">
        <button type="button" class="btn-re-primary w-100" data-role="add-to-cart">Add to cart</button>
      </div>
    </div>
  `;

  const favoriteBtn = card.querySelector<HTMLButtonElement>(".re-food-card__favorite")!;
  favoriteBtn.addEventListener("click", () => {
    const next = favoriteBtn.getAttribute("aria-pressed") !== "true";
    favoriteBtn.setAttribute("aria-pressed", String(next));
    callbacks.onToggleFavorite?.(item.id, next);
  });

  const addToCartBtn = card.querySelector<HTMLButtonElement>('[data-role="add-to-cart"]')!;
  addToCartBtn.addEventListener("click", () => {
    callbacks.onAddToCart?.(item.id);
  });

  return card;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
