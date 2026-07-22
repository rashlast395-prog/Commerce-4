import { registerWithEmail, signInWithGithub, signInWithGoogle } from "@richys-eat/firebase-client";
import { navigate } from "../router/router";

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "That email is already registered — try signing in instead.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("popup-closed-by-user")) return "Sign-up was cancelled.";
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

export function renderRegisterPage(root: HTMLElement): void {
  root.innerHTML = `
    <div class="re-auth-shell">
      <section class="re-brand-panel re-animate-fade">
        <div>
          <span style="font-family:var(--re-font-heading); font-weight:700; font-size:1.6rem;">Richy's Eat</span>
        </div>
        <p class="re-tagline mb-0">Create an account to start ordering in minutes.</p>
      </section>
      <section class="re-form-panel">
        <div class="re-form-card re-animate-slide-up">
          <h1 class="h3 mb-1">Create your account</h1>
          <p class="re-muted mb-4">It only takes a minute.</p>

          <div id="register-error" class="re-error-text mb-3" hidden></div>

          <form id="register-form" novalidate>
            <div class="mb-3">
              <label for="name" class="re-label">Full name</label>
              <input type="text" class="re-form-control w-100" id="name" required autocomplete="name" />
            </div>
            <div class="mb-3">
              <label for="email" class="re-label">Email</label>
              <input type="email" class="re-form-control w-100" id="email" required autocomplete="email" />
            </div>
            <div class="mb-3">
              <label for="password" class="re-label">Password</label>
              <input type="password" class="re-form-control w-100" id="password" required minlength="6" autocomplete="new-password" />
              <div class="form-text re-muted">At least 6 characters.</div>
            </div>
            <button type="submit" class="btn-re-primary w-100" id="register-submit">
              Create account
            </button>
          </form>

          <div class="d-flex align-items-center gap-2 my-4">
            <hr class="flex-grow-1" />
            <span class="re-muted small">or continue with</span>
            <hr class="flex-grow-1" />
          </div>

          <div class="d-grid gap-2">
            <button type="button" class="btn-re-secondary" id="google-btn">Continue with Google</button>
            <button type="button" class="btn-re-secondary" id="github-btn">Continue with GitHub</button>
          </div>

          <p class="re-muted mt-4 mb-0">
            Already have an account? <a href="/login" data-link style="color:var(--re-primary); font-weight:600;">Sign in</a>
          </p>
        </div>
      </section>
    </div>
  `;

  const errorEl = root.querySelector<HTMLDivElement>("#register-error")!;
  const showError = (message: string) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  root.querySelector<HTMLFormElement>("#register-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const name = (root.querySelector<HTMLInputElement>("#name")!).value.trim();
    const email = (root.querySelector<HTMLInputElement>("#email")!).value.trim();
    const password = (root.querySelector<HTMLInputElement>("#password")!).value;
    const submitBtn = root.querySelector<HTMLButtonElement>("#register-submit")!;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";
    try {
      await registerWithEmail(email, password, name);
      navigate("/");
    } catch (err) {
      showError(authErrorMessage(err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });

  root.querySelector<HTMLButtonElement>("#google-btn")!.addEventListener("click", async () => {
    errorEl.hidden = true;
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err) {
      showError(authErrorMessage(err));
    }
  });

  root.querySelector<HTMLButtonElement>("#github-btn")!.addEventListener("click", async () => {
    errorEl.hidden = true;
    try {
      await signInWithGithub();
      navigate("/");
    } catch (err) {
      showError(authErrorMessage(err));
    }
  });
}
