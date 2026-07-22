import { listRestaurants } from "../api/restaurants";
import { ApiClientError } from "../api/client";
import { renderRestaurantCard } from "../components/restaurantCard";
import { mountAppShell } from "../components/appShell";

export function renderRestaurantsPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);

  contentEl.innerHTML = `
    <h1 class="h3 mb-4">Restaurants near you</h1>
    <div id="restaurants-list" class="re-food-grid">
      ${Array.from({ length: 6 })
        .map(() => `<div class="re-skeleton" style="height:280px;"></div>`)
        .join("")}
    </div>
  `;

  const listEl = contentEl.querySelector<HTMLElement>("#restaurants-list")!;

  listRestaurants()
    .then((restaurants) => {
      if (restaurants.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-5" style="grid-column: 1 / -1;">
            <p class="re-muted mb-0">No restaurants are open yet — check back soon.</p>
          </div>
        `;
        return;
      }
      listEl.innerHTML = "";
      for (const restaurant of restaurants) {
        listEl.appendChild(renderRestaurantCard(restaurant));
      }
    })
    .catch((err) => {
      const message =
        err instanceof ApiClientError ? err.message : "Couldn't load restaurants. Try again in a moment.";
      listEl.innerHTML = `<div class="re-error-text" style="grid-column: 1 / -1;">${escapeHtml(message)}</div>`;
    });

  return unsubscribe;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
