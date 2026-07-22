import {
  type User,
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "./init.js";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(getFirebaseAuth(), googleProvider);
  return cred.user;
}

export async function signInWithGithub(): Promise<User> {
  const cred = await signInWithPopup(getFirebaseAuth(), githubProvider);
  return cred.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Gets a fresh ID token for calling the backend API.
 * forceRefresh=true after role changes (custom claims only refresh on new tokens).
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
