import crypto from "node:crypto";
import type { Order, PaymentStatus } from "@richys-eat/shared-types";
import { getFirestore } from "../config/firebase.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getOrderById, transitionOrderStatus } from "./orderService.js";

const PAYMENTS_COLLECTION = "payments";
export type PaymentProvider = "paystack" | "flutterwave";

interface PaymentRecord {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerReference: string;
  amount: number;
  currency: "GHS";
  status: "initiated" | "success" | "failed" | "refunded";
  createdAt: string;
}

function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}
function flutterwaveConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

/**
 * Kicks off a payment for an order. Calls the real provider API when
 * credentials are configured; otherwise returns a dev-mode response so the
 * order flow can still be exercised end-to-end locally.
 */
export async function initializePayment(
  orderId: string,
  customerId: string,
  customerEmail: string,
  provider: PaymentProvider,
): Promise<{ checkoutUrl: string | null; devMode: boolean; paymentId: string }> {
  const order = await getOrderById(orderId);
  if (order.customerId !== customerId) {
    throw new ApiError(403, "You do not have access to this order");
  }
  if (order.paymentStatus === "paid") {
    throw new ApiError(409, "This order has already been paid for");
  }

  const db = getFirestore();
  const ref = db.collection(PAYMENTS_COLLECTION).doc();
  const now = new Date().toISOString();

  const configured = provider === "paystack" ? paystackConfigured() : flutterwaveConfigured();

  if (!configured) {
    // Dev mode: no live gateway credentials. Record the intent so the
    // webhook/mock-complete path has something to reconcile against.
    const record: PaymentRecord = {
      id: ref.id,
      orderId,
      provider,
      providerReference: `dev-${ref.id}`,
      amount: order.total,
      currency: "GHS",
      status: "initiated",
      createdAt: now,
    };
    await ref.set(record);
    await db.collection("orders").doc(orderId).update({ paymentId: ref.id });
    logger.warn(`${provider} not configured — order ${orderId} payment left in dev mode`, { orderId });
    return { checkoutUrl: null, devMode: true, paymentId: ref.id };
  }

  const checkoutUrl =
    provider === "paystack"
      ? await initPaystackTransaction(order, customerEmail, ref.id)
      : await initFlutterwaveTransaction(order, customerEmail, ref.id);

  const record: PaymentRecord = {
    id: ref.id,
    orderId,
    provider,
    providerReference: ref.id,
    amount: order.total,
    currency: "GHS",
    status: "initiated",
    createdAt: now,
  };
  await ref.set(record);
  await db.collection("orders").doc(orderId).update({ paymentId: ref.id });

  return { checkoutUrl, devMode: false, paymentId: ref.id };
}

async function initPaystackTransaction(order: Order, email: string, paymentId: string): Promise<string> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: order.total, // Paystack expects the smallest currency unit — matches our pesewas storage
      currency: "GHS",
      reference: paymentId,
      metadata: { orderId: order.id },
    }),
  });
  const data = (await res.json()) as { status: boolean; data?: { authorization_url: string }; message?: string };
  if (!res.ok || !data.status || !data.data) {
    throw new ApiError(502, `Paystack initialization failed: ${data.message ?? res.statusText}`);
  }
  return data.data.authorization_url;
}

async function initFlutterwaveTransaction(order: Order, email: string, paymentId: string): Promise<string> {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: paymentId,
      amount: (order.total / 100).toFixed(2), // Flutterwave expects major units
      currency: "GHS",
      customer: { email },
      redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL ?? "",
      meta: { orderId: order.id },
    }),
  });
  const data = (await res.json()) as { status: string; data?: { link: string }; message?: string };
  if (!res.ok || data.status !== "success" || !data.data) {
    throw new ApiError(502, `Flutterwave initialization failed: ${data.message ?? res.statusText}`);
  }
  return data.data.link;
}

export function verifyPaystackSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signatureHeader;
}

export function verifyFlutterwaveSignature(signatureHeader: string | undefined): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(signatureHeader));
}

/** Marks a payment + its order as paid, and advances the order state machine. */
export async function markPaymentSucceeded(paymentId: string): Promise<void> {
  const db = getFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
  const paymentDoc = await paymentRef.get();
  if (!paymentDoc.exists) {
    logger.warn("Webhook referenced unknown payment", { paymentId });
    return;
  }
  const payment = paymentDoc.data() as PaymentRecord;

  await paymentRef.update({ status: "success" });
  await db.collection("orders").doc(payment.orderId).update({ paymentStatus: "paid" satisfies PaymentStatus });
  await transitionOrderStatus(payment.orderId, "payment_confirmed", "system:payment-webhook");

  logger.info("Payment confirmed", { paymentId, orderId: payment.orderId });
}

export async function markPaymentFailed(paymentId: string): Promise<void> {
  const db = getFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
  await paymentRef.update({ status: "failed" });
  const paymentDoc = await paymentRef.get();
  const payment = paymentDoc.data() as PaymentRecord | undefined;
  if (payment) {
    await db.collection("orders").doc(payment.orderId).update({ paymentStatus: "failed" satisfies PaymentStatus });
  }
}

/** Dev-only: simulates a successful webhook without needing live gateway credentials. */
export async function mockCompletePayment(paymentId: string, customerId: string): Promise<void> {
  const db = getFirestore();
  const paymentDoc = await db.collection(PAYMENTS_COLLECTION).doc(paymentId).get();
  if (!paymentDoc.exists) throw new ApiError(404, "Payment not found");
  const payment = paymentDoc.data() as PaymentRecord;

  const order = await getOrderById(payment.orderId);
  if (order.customerId !== customerId) throw new ApiError(403, "You do not have access to this payment");

  await markPaymentSucceeded(paymentId);
}
