import { onAuthChange } from "@richys-eat/firebase-client";
import type { User } from "firebase/auth";
import type { AppUser } from "@richys-eat/shared-types";
import { api } from "../api/client";
import { connectWs } from "../lib/ws";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

interface AuthState {
  status: AuthStatus;
  firebaseUser: User | null;
  profile: AppUser | null;
  error: string | null;
}

let state: AuthState = { status: "loading", firebaseUser: null, profile: null, error: null };
const listeners = new Set<(state: AuthState) => void>();

function setState(next: Partial<AuthState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener(state);
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribeAuth(listener: (state: AuthState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Wires up the Firebase auth listener. Call once at app startup. */
export function initAuthStore(): void {
  onAuthChange(async (user) => {
    if (!user) {
      setState({ status: "signed_out", firebaseUser: null, profile: null, error: null });
      return;
    }

    setState({ status: "loading", firebaseUser: user });

    try {
      // Ensures a Firestore profile + default role claim exist, then fetches it.
      const profile = await api.post<AppUser>("/auth/bootstrap", {
        displayName: user.displayName ?? user.email ?? "New user",
        phone: user.phoneNumber ?? null,
      });
      setState({ status: "signed_in", profile, error: null });
      connectWs();
    } catch (err) {
      setState({
        status: "signed_in",
        profile: null,
        error: err instanceof Error ? err.message : "Failed to load profile",
      });
      connectWs();
    }
  });
}
