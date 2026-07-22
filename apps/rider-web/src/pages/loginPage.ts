import { signInWithEmail, signInWithGithub, signInWithGoogle } from "@richys-eat/firebase-client";
import { navigate } from "../router/router";

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again shortly.";
  if (code.includes("popup-closed-by-user")) return "Sign-in was cancelled.";
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

export function renderLoginPage(root: HTMLElement): void {
  root.innerHTML = `
    <div class="re-auth-shell">
      <section class="re-brand-panel re-animate-fade">
        <div><span style="font-family:var(--re-font-heading); font-weight:700; font-size:1.6rem;">Richy's Eat</span></div>
        <p class="re-tagline mb-0">Rider app — accept deliveries, go online, get moving.</p>
      </section>
      <section class="re-form-panel">
        <div class="re-form-card re-animate-slide-up">
          <h1 class="h3 mb-1">Sign in</h1>
          <p class="re-muted mb-4">Rider accounts only.</p>
          <div id="login-error" class="re-error-text mb-3" hidden></div>
          <form id="login-form" novalidate>
            <div class="mb-3">
              <label for="email" class="re-label">Email</label>
              <input type="email" class="re-form-control w-100" id="email" required autocomplete="email" />
            </div>
            <div class="mb-3">
              <label for="password" class="re-label">Password</label>
              <input type="password" class="re-form-control w-100" id="password" required autocomplete="current-password" />
            </div>
            <button type="submit" class="btn-re-primary w-100" id="login-submit">Sign in</button>
          </form>
          <div class="d-flex align-items-center gap-2 my-4">
            <hr class="flex-grow-1" /><span class="re-muted small">or continue with</span><hr class="flex-grow-1" />
          </div>
          <div class="d-grid gap-2">
            <button type="button" class="btn-re-secondary" id="google-btn">Continue with Google</button>
            <button type="button" class="btn-re-secondary" id="github-btn">Continue with GitHub</button>
          </div>
          <p class="re-muted mt-4 mb-0 small">Rider accounts are provisioned by a platform admin.</p>
        </div>
      </section>
    </div>
  `;

  const errorEl = root.querySelector<HTMLDivElement>("#login-error")!;
  const showError = (message: string) => { errorEl.textContent = message; errorEl.hidden = false; };

  root.querySelector<HTMLFormElement>("#login-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = (root.querySelector<HTMLInputElement>("#email")!).value.trim();
    const password = (root.querySelector<HTMLInputElement>("#password")!).value;
    const submitBtn = root.querySelector<HTMLButtonElement>("#login-submit")!;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    try {
      await signInWithEmail(email, password);
      navigate("/");
    } catch (err) {
      showError(authErrorMessage(err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });

  root.querySelector<HTMLButtonElement>("#google-btn")!.addEventListener("click", async () => {
    errorEl.hidden = true;
    try { await signInWithGoogle(); navigate("/"); } catch (err) { showError(authErrorMessage(err)); }
  });
  root.querySelector<HTMLButtonElement>("#github-btn")!.addEventListener("click", async () => {
    errorEl.hidden = true;
    try { await signInWithGithub(); navigate("/"); } catch (err) { showError(authErrorMessage(err)); }
  });
}
