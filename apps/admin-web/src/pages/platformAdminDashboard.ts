import type { Restaurant } from "@richys-eat/shared-types";
import { mountAppShell } from "../components/appShell";
import {
  createRestaurant,
  listAllRestaurantsForAdmin,
  updateRestaurantStatus,
} from "../api/restaurants";
import { ApiClientError } from "../api/client";

export function renderPlatformAdminDashboard(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);

  contentEl.innerHTML = `
    <h1 class="h3 mb-4">Platform admin</h1>

    <section class="mb-5">
      <h2 class="h5 mb-3">Onboard a restaurant</h2>
      <form id="create-restaurant-form" class="re-row">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="re-label">Restaurant name</label>
            <input type="text" class="re-form-control w-100" id="rname" required />
          </div>
          <div class="col-md-6">
            <label class="re-label">Owner UID</label>
            <input type="text" class="re-form-control w-100" id="rowner" required placeholder="Firebase uid of the owner account" />
          </div>
          <div class="col-md-8">
            <label class="re-label">Description</label>
            <input type="text" class="re-form-control w-100" id="rdesc" />
          </div>
          <div class="col-md-4">
            <label class="re-label">Commission rate (0–1)</label>
            <input type="number" class="re-form-control w-100" id="rcommission" step="0.01" min="0" max="1" value="0.15" required />
          </div>
          <div class="col-md-4">
            <label class="re-label">Cuisine types (comma-separated)</label>
            <input type="text" class="re-form-control w-100" id="rcuisine" placeholder="Ghanaian, Grilled" />
          </div>
          <div class="col-md-4">
            <label class="re-label">Address line</label>
            <input type="text" class="re-form-control w-100" id="raddress" required />
          </div>
          <div class="col-md-4">
            <label class="re-label">City / region</label>
            <input type="text" class="re-form-control w-100" id="rcity" required value="Accra" />
          </div>
        </div>
        <div id="create-error" class="re-error-text mt-3" hidden></div>
        <button type="submit" class="btn-re-primary mt-3" id="create-submit">Create restaurant</button>
      </form>
    </section>

    <section>
      <h2 class="h5 mb-3">All restaurants</h2>
      <div id="restaurants-list" class="d-flex flex-column gap-2">
        <div class="re-skeleton" style="height:64px;"></div>
        <div class="re-skeleton" style="height:64px;"></div>
      </div>
    </section>
  `;

  const listEl = contentEl.querySelector<HTMLElement>("#restaurants-list")!;

  function loadRestaurants(): void {
    listAllRestaurantsForAdmin()
      .then((restaurants) => renderList(listEl, restaurants, loadRestaurants))
      .catch((err) => {
        const message = err instanceof ApiClientError ? err.message : "Couldn't load restaurants.";
        listEl.innerHTML = `<div class="re-error-text">${escapeHtml(message)}</div>`;
      });
  }
  loadRestaurants();

  const form = contentEl.querySelector<HTMLFormElement>("#create-restaurant-form")!;
  const errorEl = contentEl.querySelector<HTMLDivElement>("#create-error")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const submitBtn = contentEl.querySelector<HTMLButtonElement>("#create-submit")!;
    submitBtn.disabled = true;

    try {
      await createRestaurant({
        name: (contentEl.querySelector<HTMLInputElement>("#rname")!).value.trim(),
        ownerId: (contentEl.querySelector<HTMLInputElement>("#rowner")!).value.trim(),
        description: (contentEl.querySelector<HTMLInputElement>("#rdesc")!).value.trim(),
        commissionRate: Number((contentEl.querySelector<HTMLInputElement>("#rcommission")!).value),
        cuisineTypes: (contentEl.querySelector<HTMLInputElement>("#rcuisine")!).value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        address: {
          line1: (contentEl.querySelector<HTMLInputElement>("#raddress")!).value.trim(),
          city: (contentEl.querySelector<HTMLInputElement>("#rcity")!).value.trim(),
          region: "Greater Accra",
          geopoint: { lat: 5.6037, lng: -0.187 },
        },
      });
      form.reset();
      loadRestaurants();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Couldn't create restaurant.";
      errorEl.textContent = message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  return unsubscribe;
}

function renderList(listEl: HTMLElement, restaurants: Restaurant[], onChange: () => void): void {
  if (restaurants.length === 0) {
    listEl.innerHTML = `<p class="re-muted">No restaurants yet — create one above.</p>`;
    return;
  }

  listEl.innerHTML = "";
  for (const restaurant of restaurants) {
    const row = document.createElement("div");
    row.className = "re-row d-flex justify-content-between align-items-center";
    row.innerHTML = `
      <div>
        <div class="fw-semibold">${escapeHtml(restaurant.name)}</div>
        <div class="re-muted small">${escapeHtml(restaurant.description)}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="re-badge ${statusBadgeClass(restaurant.status)}">${restaurant.status}</span>
        ${restaurant.status !== "approved" ? `<button type="button" class="btn-re-secondary" data-action="approve">Approve</button>` : ""}
        ${restaurant.status !== "suspended" ? `<button type="button" class="btn-re-secondary" data-action="suspend">Suspend</button>` : ""}
      </div>
    `;

    row.querySelector('[data-action="approve"]')?.addEventListener("click", async () => {
      await updateRestaurantStatus(restaurant.id, "approved");
      onChange();
    });
    row.querySelector('[data-action="suspend"]')?.addEventListener("click", async () => {
      await updateRestaurantStatus(restaurant.id, "suspended");
      onChange();
    });

    listEl.appendChild(row);
  }
}

function statusBadgeClass(status: Restaurant["status"]): string {
  switch (status) {
    case "approved":
      return "re-badge-success";
    case "suspended":
    case "rejected":
      return "re-badge-error";
    default:
      return "re-badge-warning";
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
