import admin from "firebase-admin";
import { logger } from "./logger.js";

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      "Firebase Admin credentials are not fully set — running without a live Firebase connection. " +
        "Auth verification and Firestore access will fail until FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in services/backend/.env",
    );
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialized = true;
  logger.info("Firebase Admin initialized", { projectId });
}

export function getFirestore(): admin.firestore.Firestore {
  if (!initialized) {
    throw new Error("Firebase Admin is not initialized. Call initFirebaseAdmin() first.");
  }
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  if (!initialized) {
    throw new Error("Firebase Admin is not initialized. Call initFirebaseAdmin() first.");
  }
  return admin.auth();
}

export function isFirebaseInitialized(): boolean {
  return initialized;
}
