import { getFirebaseAuth } from "@richys-eat/firebase-client";

type WsListener = (payload: unknown) => void;
const listeners = new Map<string, Set<WsListener>>();
let socket: WebSocket | null = null;

export function connectWs(): void {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  const base = import.meta.env.VITE_BACKEND_WS_URL;
  socket = new WebSocket(`${base}/ws?uid=${encodeURIComponent(uid)}`);

  socket.addEventListener("message", (event) => {
    try {
      const { type, payload } = JSON.parse(event.data as string) as { type: string; payload: unknown };
      listeners.get(type)?.forEach((fn) => fn(payload));
    } catch {
      // ignore malformed frames
    }
  });
  socket.addEventListener("close", () => {
    setTimeout(connectWs, 3000);
  });
}

export function onWsEvent(type: string, fn: WsListener): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => listeners.get(type)?.delete(fn);
}
