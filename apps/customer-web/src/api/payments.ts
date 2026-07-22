import { api } from "./client";

export interface InitializePaymentResult {
  checkoutUrl: string | null;
  devMode: boolean;
  paymentId: string;
}

export function initializePayment(
  orderId: string,
  provider: "paystack" | "flutterwave",
): Promise<InitializePaymentResult> {
  return api.post<InitializePaymentResult>("/payments/initialize", { orderId, provider });
}

export function mockCompletePayment(paymentId: string): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>(`/payments/${paymentId}/mock-complete`);
}
