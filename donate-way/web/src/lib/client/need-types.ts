"use client";

export type NeedDoc = { id: string; kind: string; url: string; created_at: string };
export type NeedPayout = { stage: number; amount: number; txid: string | null; status: string; completed_at: string | null };

export type NeedReq = {
  id: string;
  caseType: "treatment" | "hospital_bill" | "study_fees";
  amount: number;
  windowDays: number;
  description: string;
  status: string;
  termsAccepted: boolean;
  adminNote: string | null;
  campaignId: string | null;
  endsAt: string | null;
  createdAt: string;
  raised: number | null;
  docs: NeedDoc[];
  payouts: NeedPayout[];
};

export type NeedConfig = {
  fee: number;
  windows: number[];
  stage1Pct: number;
  caseTypes: { type: NeedReq["caseType"]; max: number }[];
};

export const MAX_DOCS = 8;
export const CLOSED_STATUSES = ["rejected", "withdrawn", "closed"];

// Whether verified-need funds are switched on for this app (always on in staging, off on Mainnet until launch).
import { useEffect, useState } from "react";
import { usePi } from "./pi";

let cached: boolean | null = null;
export function useNeedEnabled(): boolean {
  const { api } = usePi();
  const [on, setOn] = useState<boolean>(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    api<{ enabled: boolean }>("/api/need")
      .then((r) => {
        cached = r.enabled;
        setOn(r.enabled);
      })
      .catch(() => undefined);
  }, [api]);
  return on;
}
