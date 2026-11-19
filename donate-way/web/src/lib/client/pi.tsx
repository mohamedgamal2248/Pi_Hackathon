"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PiPaymentDTO } from "./pi-types";

export type SessionUser = { username: string; isAdmin: boolean; hasWallet: boolean };

export type DonationItem = { campaignId: string | null; fund?: "general" | "zakat" | null; amount: number };
export type DonateArgs = {
  items: DonationItem[];
  memo: string;
  anonymous?: boolean;
  message?: string;
  gift?: { type: "gift" | "memorial"; name: string; note?: string } | null;
  zakat?: boolean;
};

type Ctx = {
  ready: boolean;
  user: SessionUser | null;
  signingIn: boolean;
  signIn: () => Promise<SessionUser | null>;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  donate: (args: DonateArgs) => Promise<{ txid: string; donationId: string }>;
  refCode: string | null;
};

const PiContext = createContext<Ctx | null>(null);

// All permissions are asked once, together, at the first sign-in. Pi remembers the consent, so later
// sign-ins (needed by the SDK on every page load before a payment) happen silently.
const SCOPES = ["username", "payments", "wallet_address", "in_app_notifications"];
const SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
const CONSENT_KEY = "sanad_consented";
const REF_KEY = "sanad_ref";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function PiProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const sdkAuthenticated = useRef(false);
  const signInPromise = useRef<Promise<SessionUser | null> | null>(null);
  const pendingIncomplete = useRef<string | null>(null);

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token.current) headers.set("Authorization", `Bearer ${token.current}`);
    const res = await fetch(path, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "error");
    return data as T;
  }, []);

  const onIncomplete = useCallback((payment: PiPaymentDTO) => {
    pendingIncomplete.current = payment.identifier;
  }, []);

  const signIn = useCallback(() => {
    if (signInPromise.current) return signInPromise.current;
    const run = async () => {
      if (!window.Pi) return null;
      setSigningIn(true);
      try {
        const auth = await window.Pi.authenticate(SCOPES, onIncomplete);
        sdkAuthenticated.current = true;
        store.set(CONSENT_KEY, "1");
        const res = await api<{ token: string; user: SessionUser }>("/api/auth/signin", {
          method: "POST",
          body: JSON.stringify({
            accessToken: auth.accessToken,
            walletAddress: (auth.user as { wallet_address?: string }).wallet_address,
            ref: store.get(REF_KEY),
          }),
        });
        token.current = res.token;
        setUser(res.user);
        if (pendingIncomplete.current) {
          const paymentId = pendingIncomplete.current;
          pendingIncomplete.current = null;
          await api("/api/payments/incomplete", { method: "POST", body: JSON.stringify({ paymentId }) }).catch(() => undefined);
        }
        return res.user;
      } finally {
        setSigningIn(false);
        signInPromise.current = null;
      }
    };
    signInPromise.current = run();
    return signInPromise.current;
  }, [api, onIncomplete]);

  // Load the SDK; remember a referral code from ?ref=; sign in silently if consent was given before.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[a-z0-9]{6,12}$/.test(ref)) store.set(REF_KEY, ref);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
      setRefCode(store.get(REF_KEY));
    } catch {}

    let cancelled = false;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      if (window.Pi) {
        clearInterval(timer);
        try {
          await window.Pi.init({ version: "2.0", sandbox: SANDBOX });
        } catch {}
        if (cancelled) return;
        setReady(true);
        if (store.get(CONSENT_KEY) === "1") signIn().catch(() => undefined);
      } else if (tries > 60) {
        clearInterval(timer);
        if (!cancelled) setReady(true);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [signIn]);

  const donate = useCallback(
    async (args: DonateArgs) => {
      if (!window.Pi) throw new Error("pi_sdk_missing");
      if (!token.current || !sdkAuthenticated.current) await signIn();
      if (!token.current) throw new Error("sign_in_required");
      const amount = Math.round(args.items.reduce((s, i) => s + i.amount, 0) * 1e7) / 1e7;
      return new Promise<{ txid: string; donationId: string }>((resolve, reject) => {
        window.Pi!.createPayment(
          {
            amount,
            memo: args.memo.slice(0, 100),
            metadata: {
              kind: "donation",
              items: args.items.map((i) => ({ campaignId: i.campaignId, fund: i.campaignId ? null : i.fund ?? "general", amount: i.amount })),
              anonymous: !!args.anonymous,
              message: args.message ?? "",
              gift: args.gift ?? null,
              ref: store.get(REF_KEY),
              zakat: !!args.zakat,
            },
          },
          {
            onReadyForServerApproval: (paymentId) => {
              api("/api/payments/approve", { method: "POST", body: JSON.stringify({ paymentId }) }).catch(reject);
            },
            onReadyForServerCompletion: (paymentId, txid) => {
              api<{ donationId: string }>("/api/payments/complete", { method: "POST", body: JSON.stringify({ paymentId, txid }) })
                .then((r) => resolve({ txid, donationId: r.donationId }))
                .catch(reject);
            },
            onCancel: (paymentId) => {
              api("/api/payments/cancel", { method: "POST", body: JSON.stringify({ paymentId }) }).catch(() => undefined);
              reject(new Error("cancelled"));
            },
            onError: (error) => reject(error),
          }
        );
      });
    },
    [api, signIn]
  );

  return <PiContext.Provider value={{ ready, user, signingIn, signIn, api, donate, refCode }}>{children}</PiContext.Provider>;
}

export function usePi() {
  const ctx = useContext(PiContext);
  if (!ctx) throw new Error("usePi outside PiProvider");
  return ctx;
}
