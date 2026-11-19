"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PiPaymentDTO } from "./pi-types";

export type SessionUser = { username: string; isAdmin: boolean; organizerStatus: string | null };

type DonateArgs = {
  amount: number;
  campaignId: string | null;
  memo: string;
  anonymous?: boolean;
  message?: string;
  recurringId?: string | null;
};

type Ctx = {
  ready: boolean;
  inPiBrowser: boolean;
  user: SessionUser | null;
  signingIn: boolean;
  signIn: () => Promise<SessionUser | null>;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  donate: (args: DonateArgs) => Promise<{ txid: string }>;
};

const PiContext = createContext<Ctx | null>(null);

const SCOPES = ["username", "payments", "in_app_notifications"];
const SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function PiProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [inPiBrowser, setInPiBrowser] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const token = useRef<string | null>(null);
  // The Pi SDK needs authenticate() on every page load before createPayment().
  const sdkAuthenticated = useRef(false);

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token.current) headers.set("Authorization", `Bearer ${token.current}`);
    const res = await fetch(path, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "error");
    return data as T;
  }, []);

  // Wait for the SDK script from layout.tsx and initialize it once.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      if (window.Pi) {
        clearInterval(timer);
        try {
          await window.Pi.init({ version: "2.0", sandbox: SANDBOX });
          if (!cancelled) setInPiBrowser(SANDBOX || /PiBrowser/i.test(navigator.userAgent) || window.parent !== window);
        } catch (e) {
          console.warn("Pi.init failed", e);
        }
        if (!cancelled) setReady(true);
      } else if (tries > 50) {
        clearInterval(timer);
        if (!cancelled) setReady(true);
      }
    }, 100);
    try {
      const saved = sessionStorage.getItem("dw_session");
      if (saved) {
        const parsed = JSON.parse(saved) as { token: string; user: SessionUser };
        token.current = parsed.token;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore session after hydration
        setUser(parsed.user);
      }
    } catch {}
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // A payment left over from an interrupted session. The SDK reports it during authenticate(),
  // before we have our own session, so it is resolved right after sign-in (verified on our server).
  const pendingIncomplete = useRef<string | null>(null);
  const onIncomplete = useCallback((payment: PiPaymentDTO) => {
    pendingIncomplete.current = payment.identifier;
  }, []);

  const signIn = useCallback(async () => {
    if (!window.Pi) return null;
    setSigningIn(true);
    try {
      const auth = await window.Pi.authenticate(SCOPES, onIncomplete);
      sdkAuthenticated.current = true;
      const res = await api<{ token: string; user: SessionUser }>("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ accessToken: auth.accessToken }),
      });
      token.current = res.token;
      setUser(res.user);
      try {
        sessionStorage.setItem("dw_session", JSON.stringify(res));
      } catch {}
      if (pendingIncomplete.current) {
        const paymentId = pendingIncomplete.current;
        pendingIncomplete.current = null;
        await api("/api/payments/incomplete", { method: "POST", body: JSON.stringify({ paymentId }) }).catch((e) =>
          console.warn("incomplete payment", e)
        );
      }
      return res.user;
    } finally {
      setSigningIn(false);
    }
  }, [api, onIncomplete]);

  const donate = useCallback(
    async (args: DonateArgs) => {
      if (!window.Pi) throw new Error("pi_sdk_missing");
      if (!token.current || !sdkAuthenticated.current) await signIn();
      return new Promise<{ txid: string }>((resolve, reject) => {
        window.Pi!.createPayment(
          {
            amount: args.amount,
            memo: args.memo.slice(0, 100),
            metadata: {
              kind: "donation",
              campaignId: args.campaignId,
              anonymous: !!args.anonymous,
              message: args.message ?? "",
              recurringId: args.recurringId ?? null,
            },
          },
          {
            onReadyForServerApproval: (paymentId) => {
              api("/api/payments/approve", { method: "POST", body: JSON.stringify({ paymentId }) }).catch(reject);
            },
            onReadyForServerCompletion: (paymentId, txid) => {
              api("/api/payments/complete", { method: "POST", body: JSON.stringify({ paymentId, txid }) })
                .then(() => resolve({ txid }))
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

  return (
    <PiContext.Provider value={{ ready, inPiBrowser, user, signingIn, signIn, api, donate }}>{children}</PiContext.Provider>
  );
}

export function usePi() {
  const ctx = useContext(PiContext);
  if (!ctx) throw new Error("usePi outside PiProvider");
  return ctx;
}
