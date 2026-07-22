import type { MenuItem, Restaurant } from "@richys-eat/shared-types";
import { getRestaurant, listMenuItems } from "../api/restaurants";
import { createReservation } from "../api/reservations";
import { ApiClientError } from "../api/client";
import { mountAppShell } from "../components/appShell";
import { renderFoodCard } from "../components/foodCard";
import { addToCart, CartRestaurantConflictError } from "../state/cartStore";
import { navigate } from "../router/router";

export function renderRestaurantDetailPage(root: HTMLElement, params: Record<string, string>): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  const restaurantId = params.id as string;

  contentEl.innerHTML = `
    <div class="re-skeleton" style="height:140px; margin-bottom:24px;"></div>
    <div class="re-food-grid">
      ${Array.from({ length: 3 })
        .map(() => `<div class="re-skeleton" style="height:280px;"></div>`)
        .join("")}
    </div>
  `;

  Promise.all([getRestaurant(restaurantId), listMenuItems(restaurantId)])
    .then(([restaurant, menuItems]) => {
      renderDetail(contentEl, restaurant, menuItems);
    })
    .catch((err) => {
      const message =
        err instanceof ApiClientError ? err.message : "Couldn't load this restaurant. Try again in a moment.";
      contentEl.innerHTML = `<div class="re-error-text">${escapeHtml(message)}</div>`;
    });

  return unsubscribe;
}

function renderDetail(contentEl: HTMLElement, restaurant: Restaurant, menuItems: MenuItem[]): void {
  contentEl.innerHTML = `
    <div class="mb-4">
      <h1 class="h3 mb-1">${escapeHtml(restaurant.name)}</h1>
      <p class="re-muted mb-1">${escapeHtml(restaurant.description)}</p>
      <div class="d-flex align-items-center gap-2 small">
        <span><span style="color:var(--re-secondary);">★</span> ${restaurant.ratingAvg.toFixed(1)} <span class="re-muted">(${restaurant.ratingCount})</span></span>
        ${restaurant.cuisineTypes.map((c) => `<span class="re-badge re-badge-accent">${escapeHtml(c)}</span>`).join("")}
        ${!restaurant.isOpenNow ? '<span class="re-badge re-badge-warning">Closed right now</span>' : ""}
      </div>
    </div>
  `;

  if (menuItems.length === 0) {
    contentEl.insertAdjacentHTML("beforeend", `<p class="re-muted">This restaurant hasn't added any menu items yet.</p>`);
    return;
  }

  const byCategory = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  for (const [category, items] of byCategory) {
    const section = document.createElement("section");
    section.className = "mb-5";
    section.innerHTML = `<h2 class="re-section-title">${escapeHtml(category)}</h2>`;

    const grid = document.createElement("div");
    grid.className = "re-food-grid";

    for (const item of items) {
      grid.appendChild(
        renderFoodCard(
          {
            id: item.id,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl ?? `https://picsum.photos/seed/${item.id}/480/360`,
            priceMinorUnits: item.price,
            rating: restaurant.ratingAvg,
            ratingCount: restaurant.ratingCount,
            category: item.category,
          },
          {
            onAddToCart: () => handleAddToCart(restaurant, item),
          },
        ),
      );
    }

    section.appendChild(grid);
    contentEl.appendChild(section);
  }
}

function handleAddToCart(restaurant: Restaurant, item: MenuItem): void {
  // Items with required modifiers need a picker (Phase 2 follow-up) —
  // for now, only add items with no required modifiers directly.
  const hasRequiredModifiers = item.modifiers.some((m) => m.required);
  if (hasRequiredModifiers) {
    window.alert(`${item.name} has required options — a selection picker is coming in the next iteration.`);
    return;
  }

  const line = {
    menuItemId: item.id,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    name: item.name,
    imageUrl: item.imageUrl ?? `https://picsum.photos/seed/${item.id}/480/360`,
    unitPriceMinorUnits: item.price,
    quantity: 1,
    selectedModifiers: [],
  };

  try {
    addToCart(line);
  } catch (err) {
    if (err instanceof CartRestaurantConflictError) {
      const confirmed = window.confirm(
        `Your cart has items from ${err.currentRestaurantName}. Start a new cart for ${restaurant.name}?`,
      );
      if (confirmed) {
        addToCart(line, { forceReplace: true });
      }
      return;
    }
    throw err;
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
