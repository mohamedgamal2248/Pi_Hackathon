"use client";

import { useLang } from "@/lib/client/i18n";
import { nt, type NeedKey } from "@/lib/client/need-i18n";

const STEPS = ["step_review", "step_fund", "step_pay1", "step_proof", "step_done"] as const;
const INDEX: Record<string, number> = {
  draft: 0, fee_pending: 0, pending_review: 0, needs_more_proof: 0,
  fundraising: 1, payout_due: 2, stage1_paid: 3, proof_submitted: 3, closed: 4,
};

// Where the request is in its life; hidden for rejected / withdrawn.
export function NeedStepper({ status }: { status: string }) {
  const { lang } = useLang();
  const at = INDEX[status];
  if (at === undefined) return null;
  return (
    <ol className="flex items-center gap-1" aria-label={nt(lang, "mine_title")}>
      {STEPS.map((k, i) => (
        <li key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center" aria-current={i === at ? "step" : undefined}>
          <span className={`h-1.5 w-full rounded-full ${i < at ? "bg-brand" : i === at ? "bg-brand/60" : "bg-surface-2"}`} />
          <span className={`text-[10px] leading-tight ${i === at ? "font-bold text-brand" : "text-muted"}`}>{nt(lang, k as NeedKey)}</span>
        </li>
      ))}
    </ol>
  );
}
