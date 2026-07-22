import { listNotifications, markNotificationRead, type AppNotification } from "../api/notifications";
import { ApiClientError } from "../api/client";
import { mountAppShell } from "../components/appShell";

export function renderNotificationsPage(root: HTMLElement): () => void {
  const { contentEl, unsubscribe } = mountAppShell(root);
  contentEl.innerHTML = `<h1 class="h3 mb-4">Notifications</h1><div id="notif-list" class="d-flex flex-column gap-2"></div>`;
  const listEl = contentEl.querySelector<HTMLElement>("#notif-list")!;

  listNotifications()
    .then((notifications) => {
      if (notifications.length === 0) {
        listEl.innerHTML = `<p class="re-muted">No notifications yet.</p>`;
        return;
      }
      for (const n of notifications) {
        const row = document.createElement("div");
        row.className = `re-row d-flex justify-content-between align-items-start ${n.isRead ? "" : "re-hover-lift"}`;
        row.style.borderLeft = n.isRead ? "" : "3px solid var(--re-primary)";
        row.innerHTML = `
          <div>
            <div class="fw-semibold">${escapeHtml(n.title)}</div>
            <div class="re-muted small">${escapeHtml(n.body)}</div>
            <div class="re-muted small">${new Date(n.createdAt).toLocaleString()}</div>
          </div>
          ${!n.isRead ? `<button type="button" class="btn-re-secondary" data-action="read">Mark read</button>` : ""}
        `;
        row.querySelector('[data-action="read"]')?.addEventListener("click", async () => {
          await markNotificationRead(n.id);
          row.remove();
        });
        listEl.appendChild(row);
      }
    })
    .catch((err) => {
      const message = err instanceof ApiClientError ? err.message : "Couldn't load notifications.";
      listEl.innerHTML = `<div class="re-error-text">${message}</div>`;
    });

  return unsubscribe;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
