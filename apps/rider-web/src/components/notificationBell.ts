import { listNotifications, markNotificationRead, type AppNotification } from "../api/notifications";
import { onWsEvent } from "../lib/ws";

export function mountNotificationBell(container: HTMLElement): void {
  container.innerHTML = `
    <div class="position-relative">
      <button type="button" class="btn-re-secondary position-relative" id="bell-btn" aria-label="Notifications">
        🔔
        <span id="bell-badge" class="re-badge re-badge-error" style="position:absolute; top:-6px; right:-6px; display:none; font-size:10px; padding:1px 5px;">0</span>
      </button>
      <div id="bell-dropdown" class="re-card p-2" style="position:absolute; right:0; top:110%; width:320px; max-height:360px; overflow-y:auto; z-index:30; display:none;"></div>
    </div>
  `;

  const btn = container.querySelector<HTMLButtonElement>("#bell-btn")!;
  const badge = container.querySelector<HTMLElement>("#bell-badge")!;
  const dropdown = container.querySelector<HTMLElement>("#bell-dropdown")!;

  function updateBadge(items: AppNotification[]): void {
    const unread = items.filter((n) => !n.isRead).length;
    badge.style.display = unread > 0 ? "flex" : "none";
    badge.textContent = String(unread);
  }

  function renderList(items: AppNotification[]): void {
    if (items.length === 0) {
      dropdown.innerHTML = `<p class="re-muted small p-2 mb-0">No notifications yet.</p>`;
      return;
    }
    dropdown.innerHTML = items
      .map(
        (n) => `
          <div class="p-2 border-bottom" data-id="${n.id}" style="cursor:pointer; ${n.isRead ? "opacity:0.6;" : ""}">
            <div class="small fw-semibold">${escapeHtml(n.title)}</div>
            <div class="small re-muted">${escapeHtml(n.body)}</div>
          </div>
        `,
      )
      .join("");
    dropdown.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
      el.addEventListener("click", async () => {
        await markNotificationRead(el.dataset.id as string);
        load();
      });
    });
  }

  function load(): void {
    listNotifications()
      .then((items) => {
        updateBadge(items);
        renderList(items);
      })
      .catch(() => {
        dropdown.innerHTML = `<p class="re-error-text small p-2 mb-0">Couldn't load notifications.</p>`;
      });
  }

  btn.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
    if (dropdown.style.display === "block") load();
  });

  onWsEvent("notification:new", () => load());
  load();
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
