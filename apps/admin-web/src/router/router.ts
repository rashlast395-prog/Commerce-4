type RouteRender = (container: HTMLElement, params: Record<string, string>) => void | (() => void);

interface Route {
  path: string;
  render: RouteRender;
  /** If true, redirects to /login when signed out. */
  requiresAuth?: boolean;
}

interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

const routes: Route[] = [];
let container: HTMLElement | null = null;
let currentCleanup: (() => void) | null = null;
let isSignedIn: () => boolean = () => false;

export function registerRoute(route: Route): void {
  routes.push(route);
}

export function setAuthCheck(fn: () => boolean): void {
  isSignedIn = fn;
}

export function initRouter(rootEl: HTMLElement): void {
  container = rootEl;
  window.addEventListener("popstate", () => renderCurrentPath());
  document.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-link]");
    if (!target) return;
    e.preventDefault();
    navigate(target.getAttribute("href") ?? "/");
  });
  renderCurrentPath();
}

export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  renderCurrentPath();
}

/** Matches "/restaurants/:id" against "/restaurants/abc123" -> { id: "abc123" }. */
function matchPath(pattern: string, actual: string): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const actualSegments = actual.split("/").filter(Boolean);
  if (patternSegments.length !== actualSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i] as string;
    const a = actualSegments[i] as string;
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

function findMatch(path: string): RouteMatch | null {
  for (const route of routes) {
    if (route.path === "*") continue;
    const params = matchPath(route.path, path);
    if (params) return { route, params };
  }
  const wildcard = routes.find((r) => r.path === "*");
  return wildcard ? { route: wildcard, params: {} } : null;
}

export function renderCurrentPath(): void {
  if (!container) return;
  const path = window.location.pathname;
  const match = findMatch(path);

  if (!match) return;
  const { route, params } = match;

  if (route.requiresAuth && !isSignedIn()) {
    navigate("/login");
    return;
  }

  currentCleanup?.();
  container.innerHTML = "";
  const cleanup = route.render(container, params);
  currentCleanup = typeof cleanup === "function" ? cleanup : null;
}
