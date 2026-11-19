import "server-only";
import { env } from "./env";

const BASE = "https://api.minepi.com/v2";

export type PiUser = {
  uid: string;
  username?: string;
  credentials?: { scopes: string[] };
};

export type PiPayment = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  from_address: string;
  to_address: string;
  direction: "user_to_app" | "app_to_user";
  network: string;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
};

export class PiApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { auth: string }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: init.auth, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new PiApiError(res.status, `Pi API ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const serverKey = () => `Key ${env.piApiKey()}`;

// The only trusted way to know who the user is: ask Pi with their access token.
export function verifyAccessToken(accessToken: string) {
  return call<PiUser>("/me", { method: "GET", auth: `Bearer ${accessToken}` });
}

export function getPayment(paymentId: string) {
  return call<PiPayment>(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET", auth: serverKey() });
}

export function approvePayment(paymentId: string) {
  return call<PiPayment>(`/payments/${encodeURIComponent(paymentId)}/approve`, { method: "POST", auth: serverKey() });
}

export function completePayment(paymentId: string, txid: string) {
  return call<PiPayment>(`/payments/${encodeURIComponent(paymentId)}/complete`, {
    method: "POST",
    auth: serverKey(),
    body: JSON.stringify({ txid }),
  });
}

export function cancelPayment(paymentId: string) {
  return call<PiPayment>(`/payments/${encodeURIComponent(paymentId)}/cancel`, { method: "POST", auth: serverKey() });
}

export type PiNotification = { user_uid: string; title: string; body: string; subroute: string };

// Pi Notification Center. Best effort: never let a notification failure break the main flow.
export async function notify(notifications: PiNotification[]) {
  for (let i = 0; i < notifications.length; i += 256) {
    const batch = notifications.slice(i, i + 256).map((n) => ({
      ...n,
      title: n.title.slice(0, 120),
      body: n.body.slice(0, 400),
    }));
    try {
      await call("/in_app_notifications/notify", {
        method: "POST",
        auth: serverKey(),
        body: JSON.stringify({ notifications: batch }),
      });
    } catch (err) {
      console.warn("notify failed", err);
    }
  }
}
