import { Router } from "express";
import { isFirebaseInitialized } from "../config/firebase.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "richys-eat-backend",
    firebaseConnected: isFirebaseInitialized(),
    timestamp: new Date().toISOString(),
  });
});
