import type { Restaurant } from "@richys-eat/shared-types";
import { navigate } from "../router/router";

export function renderRestaurantCard(restaurant: Restaurant): HTMLElement {
  const card = document.createElement("article");
  card.className = "re-card re-hover-lift re-animate-slide-up";
  card.style.cursor = "pointer";
  card.style.overflow = "hidden";

  const imageUrl = restaurant.coverImageUrl ?? `https://picsum.photos/seed/${restaurant.id}/480/320`;

  card.innerHTML = `
    <div class="re-food-card__image-wrap">
      <img src="${imageUrl}" alt="${escapeHtml(restaurant.name)}" loading="lazy" />
    </div>
    <div class="re-food-card__body">
      <h3 class="re-food-card__name">${escapeHtml(restaurant.name)}</h3>
      <p class="re-food-card__description">${escapeHtml(restaurant.description)}</p>
      <div class="re-food-card__rating">
        <span class="re-star" aria-hidden="true">★</span>
        <span>${restaurant.ratingAvg.toFixed(1)}</span>
        <span class="re-muted">(${restaurant.ratingCount})</span>
        ${!restaurant.isOpenNow ? '<span class="re-badge re-badge-warning ms-2">Closed</span>' : ""}
      </div>
    </div>
  `;

  card.addEventListener("click", () => navigate(`/restaurants/${restaurant.id}`));
  return card;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
