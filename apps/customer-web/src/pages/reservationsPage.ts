import { listMyReservations } from "../api/reservations";
import { ApiClientError } from "../api/client";
import { mountAppShell } from "../components/appShell";

const STATUS_BADGE: Record<string, string> = {
  requested: "re-badge-warning",
  confirmed: "re-badge-success",
  cancelled: "re-badge-error",
  completed: "re-badge-accent",
  no_show: "re-badge-error",
};

export function renderReservationsPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  contentEl.innerHTML = `<h1 class="h3 mb-4">Your reservations</h1><div id="res-list" class="d-flex flex-column gap-2"></div>`;
  const listEl = contentEl.querySelector<HTMLElement>("#res-list")!;

  listMyReservations()
    .then((reservations) => {
      if (reservations.length === 0) {
        listEl.innerHTML = `<p class="re-muted">No reservations yet — book a table from a restaurant's page.</p>`;
        return;
      }
      listEl.innerHTML = reservations
        .map(
          (r) => `
            <div class="re-row d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">Party of ${r.partySize}</div>
                <div class="re-muted small">${new Date(r.reservationTime).toLocaleString()}</div>
              </div>
              <span class="re-badge ${STATUS_BADGE[r.status] ?? "re-badge-accent"}">${r.status}</span>
            </div>
          `,
        )
        .join("");
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load reservations.";
      listEl.innerHTML = `<div class="re-error-text">${message}</div>`;
    });

  return unsubscribe;
}
