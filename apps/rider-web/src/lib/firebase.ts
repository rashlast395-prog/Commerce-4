import { initFirebaseClient } from "@richys-eat/firebase-client";

let configError: string | null = null;

export function bootFirebase(): { ok: boolean; error: string | null } {
  if (configError !== null) return { ok: false, error: configError };

  try {
    initFirebaseClient({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    return { ok: true, error: null };
  } catch (err) {
    configError = err instanceof Error ? err.message : "Unknown Firebase init error";
    return { ok: false, error: configError };
  }
}
