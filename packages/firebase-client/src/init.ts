import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

/**
 * Call once at app startup with values from import.meta.env
 * (VITE_FIREBASE_* — see .env.example in each app).
 */
export function initFirebaseClient(config: FirebaseClientConfig): void {
  if (app) return; // already initialized, safe to call more than once

  const missing = Object.entries(config).filter(([, v]) => !v);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config is missing: ${missing.map(([k]) => k).join(", ")}. ` +
        "Fill in your app's .env from .env.example with values from the Firebase console.",
    );
  }

  app = initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

function ensureInitialized(): void {
  if (!app) {
    throw new Error("Firebase client not initialized. Call initFirebaseClient() first.");
  }
}

export function getFirebaseAuth(): Auth {
  ensureInitialized();
  return authInstance as Auth;
}

export function getFirebaseDb(): Firestore {
  ensureInitialized();
  return dbInstance as Firestore;
}

export function getFirebaseStorage(): FirebaseStorage {
  ensureInitialized();
  return storageInstance as FirebaseStorage;
}
