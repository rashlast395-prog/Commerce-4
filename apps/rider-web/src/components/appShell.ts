import { getAuthState, subscribeAuth } from "../state/authStore";
import { renderNavbar } from "./navbar";

export function mountAppShell(root: HTMLElement): { contentEl: HTMLElement; unsubscribe: () => void } {
  root.innerHTML = `
    <div class="re-app-shell">
      <div id="navbar"></div>
      <main class="container py-4" id="page-content"></main>
    </div>
  `;
  const navbarEl = root.querySelector<HTMLElement>("#navbar")!;
  const contentEl = root.querySelector<HTMLElement>("#page-content")!;
  const unsubscribe = subscribeAuth((state) => renderNavbar(navbarEl, state.profile));
  renderNavbar(navbarEl, getAuthState().profile);
  return { contentEl, unsubscribe };
}
