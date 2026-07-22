import { getFirestore } from "../config/firebase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { sendToUsers } from "../ws/server.js";

export type ConversationType = "customer_rider" | "customer_restaurant" | "restaurant_platform_admin";

export interface Conversation {
  id: string;
  participantIds: string[];
  type: ConversationType;
  orderId: string | null;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  sentAt: string;
  readBy: string[];
}

const CONVERSATIONS_COLLECTION = "conversations";

/** Finds an existing conversation for this order+type, or creates one. */
export async function getOrCreateConversation(
  participantIds: string[],
  type: ConversationType,
  orderId: string | null,
): Promise<Conversation> {
  const db = getFirestore();

  if (orderId) {
    const existing = await db
      .collection(CONVERSATIONS_COLLECTION)
      .where("orderId", "==", orderId)
      .where("type", "==", type)
      .limit(1)
      .get();
    if (!existing.empty) {
      const doc = existing.docs[0]!;
      return { id: doc.id, ...doc.data() } as Conversation;
    }
  }

  const ref = db.collection(CONVERSATIONS_COLLECTION).doc();
  const conversation: Conversation = {
    id: ref.id,
    participantIds,
    type,
    orderId,
    lastMessageAt: new Date().toISOString(),
  };
  await ref.set(conversation);
  return conversation;
}

export async function listConversationsForUser(userId: string): Promise<Conversation[]> {
  const db = getFirestore();
  const snap = await db
    .collection(CONVERSATIONS_COLLECTION)
    .where("participantIds", "array-contains", userId)
    .orderBy("lastMessageAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Conversation);
}

async function assertParticipant(conversationId: string, userId: string): Promise<Conversation> {
  const db = getFirestore();
  const doc = await db.collection(CONVERSATIONS_COLLECTION).doc(conversationId).get();
  if (!doc.exists) throw new ApiError(404, "Conversation not found");
  const conversation = { id: doc.id, ...doc.data() } as Conversation;
  if (!conversation.participantIds.includes(userId)) {
    throw new ApiError(403, "You are not part of this conversation");
  }
  return conversation;
}

export async function listMessages(conversationId: string, userId: string): Promise<Message[]> {
  await assertParticipant(conversationId, userId);
  const db = getFirestore();
  const snap = await db
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId)
    .collection("messages")
    .orderBy("sentAt", "asc")
    .get();
  return snap.docs.map((doc) => doc.data() as Message);
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<Message> {
  const conversation = await assertParticipant(conversationId, senderId);
  const db = getFirestore();
  const now = new Date().toISOString();
  const ref = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId).collection("messages").doc();

  const message: Message = { id: ref.id, senderId, text, sentAt: now, readBy: [senderId] };
  await ref.set(message);
  await db.collection(CONVERSATIONS_COLLECTION).doc(conversationId).update({ lastMessageAt: now });

  const recipients = conversation.participantIds.filter((id) => id !== senderId);
  sendToUsers(recipients, { type: "message:new", payload: { conversationId, message } });

  return message;
}
