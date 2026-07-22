import express, { Router } from "express";
import { logger } from "../config/logger.js";
import {
  markPaymentFailed,
  markPaymentSucceeded,
  verifyFlutterwaveSignature,
  verifyPaystackSignature,
} from "../services/paymentService.js";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/paystack",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const rawBody = req.body as Buffer;

    if (!verifyPaystackSignature(rawBody, signature)) {
      logger.warn("Rejected Paystack webhook: bad signature");
      res.status(401).send("Invalid signature");
      return;
    }

    const event = JSON.parse(rawBody.toString("utf-8")) as { event: string; data: { reference: string } };
    try {
      if (event.event === "charge.success") {
        await markPaymentSucceeded(event.data.reference);
      } else if (event.event === "charge.failed") {
        await markPaymentFailed(event.data.reference);
      }
      res.status(200).send("ok");
    } catch (err) {
      logger.error("Paystack webhook processing failed", { error: (err as Error).message });
      res.status(200).send("ok"); // ack anyway so Paystack doesn't retry-storm; we've logged it
    }
  },
);

webhooksRouter.post(
  "/flutterwave",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["verif-hash"] as string | undefined;
    const rawBody = req.body as Buffer;

    if (!verifyFlutterwaveSignature(signature)) {
      logger.warn("Rejected Flutterwave webhook: bad signature");
      res.status(401).send("Invalid signature");
      return;
    }

    const event = JSON.parse(rawBody.toString("utf-8")) as {
      event: string;
      data: { tx_ref: string; status: string };
    };
    try {
      if (event.data?.status === "successful") {
        await markPaymentSucceeded(event.data.tx_ref);
      } else if (event.data?.status === "failed") {
        await markPaymentFailed(event.data.tx_ref);
      }
      res.status(200).send("ok");
    } catch (err) {
      logger.error("Flutterwave webhook processing failed", { error: (err as Error).message });
      res.status(200).send("ok");
    }
  },
);
