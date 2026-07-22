import type { NextFunction, Request, Response } from "express";
import { isFirebaseInitialized } from "../config/firebase.js";

export function requireFirebaseReady(_req: Request, res: Response, next: NextFunction): void {
  if (!isFirebaseInitialized()) {
    res.status(503).json({
      error: "This endpoint requires Firebase to be configured — set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in services/backend/.env",
    });
    return;
  }
  next();
}
