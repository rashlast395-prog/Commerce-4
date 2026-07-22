import { getAuthState, subscribeAuth } from "../state/authStore";
import { renderNavbar } from "../components/navbar";
import { renderHero } from "../components/hero";
import { navigate } from "../router/router";

export function renderHomePage(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="re-app-shell">
      <div id="navbar"></div>
      <main class="container py-4">
        <div id="home-content"></div>
      </main>
    </div>
  `;

  const navbarEl = root.querySelector<HTMLElement>("#navbar")!;
  const contentEl = root.querySelector<HTMLElement>("#home-content")!;

  const unsubscribe = subscribeAuth((state) => {
    renderNavbar(navbarEl, state.profile);

    if (state.status === "loading") {
      contentEl.innerHTML = `<div class="re-skeleton" style="height:220px;"></div>`;
      return;
    }

    if (state.error) {
      contentEl.innerHTML = `<div class="re-error-text">${escapeHtml(state.error)}</div>`;
      return;
    }

    if (state.profile) {
      contentEl.innerHTML = `<p class="re-muted mb-3">Hey ${escapeHtml(state.profile.displayName)} 👋</p>`;
      contentEl.appendChild(renderHero());

      const cta = document.createElement("div");
      cta.className = "text-center mt-4";
      cta.innerHTML = `<button type="button" class="btn-re-primary" id="browse-cta">Browse restaurants</button>`;
      cta.querySelector("#browse-cta")!.addEventListener("click", () => navigate("/restaurants"));
      contentEl.appendChild(cta);
    }
  });

  renderNavbar(navbarEl, getAuthState().profile);

  return unsubscribe;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
