import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireFirebaseReady } from "../middleware/firebaseReady.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  getOrCreateConversation,
  listConversationsForUser,
  listMessages,
  sendMessage,
} from "../services/messagingService.js";
import { sendMessageSchema, startConversationSchema } from "./conversations.schemas.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireFirebaseReady, requireAuth);

conversationsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = startConversationSchema.parse(req.body);
    if (!input.participantIds.includes(req.user!.uid)) {
      throw new ApiError(403, "You can only start conversations you're a participant in");
    }
    res.status(201).json(await getOrCreateConversation(input.participantIds, input.type, input.orderId));
  } catch (err) {
    next(err);
  }
});

conversationsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listConversationsForUser(req.user!.uid));
  } catch (err) {
    next(err);
  }
});

conversationsRouter.get("/:id/messages", async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await listMessages(req.params.id as string, req.user!.uid));
  } catch (err) {
    next(err);
  }
});

conversationsRouter.post("/:id/messages", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { text } = sendMessageSchema.parse(req.body);
    res.status(201).json(await sendMessage(req.params.id as string, req.user!.uid, text));
  } catch (err) {
    next(err);
  }
});
