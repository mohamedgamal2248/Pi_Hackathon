"use client";

import { useLang } from "@/lib/client/i18n";
import { nt, type NeedKey } from "@/lib/client/need-i18n";
import type { NeedReq } from "@/lib/client/need-types";

// A drawn sample of the document we need (no real data) plus photo tips.
export function DocExample({ caseType }: { caseType: NeedReq["caseType"] }) {
  const { lang } = useLang();
  const field = (y: number, label: string, w: number) => (
    <g key={label}>
      <rect x="14" y={y} width={w} height="30" rx="5" fill="#fff" stroke="#2f7d32" strokeWidth="2.5" strokeDasharray="5 4" />
      <text x="22" y={y + 21} fontSize="16" fontWeight="700" fill="#2f7d32">
        {label}
      </text>
    </g>
  );
  return (
    <div className="space-y-3 rounded-2xl bg-surface-2 p-3 text-sm">
      <div className="flex gap-3">
        <svg viewBox="0 0 220 280" width="140" height="178" role="img" aria-label={nt(lang, "ex_sample")} className="shrink-0 rounded-lg bg-white">
          <rect x="0" y="0" width="220" height="38" fill="#cfd8dc" />
          <text x="110" y="25" fontSize="16" fontWeight="700" textAnchor="middle" fill="#37474f">
            {nt(lang, `ex_s_${caseType}` as NeedKey)}
          </text>
          {field(52, nt(lang, "ex_f_name"), 150)}
          {field(92, nt(lang, "ex_f_date"), 120)}
          {field(132, nt(lang, "ex_f_amount"), 140)}
          <rect x="14" y="180" width="192" height="7" rx="3.5" fill="#cfd8dc" />
          <rect x="14" y="196" width="170" height="7" rx="3.5" fill="#cfd8dc" />
          <circle cx="165" cy="238" r="30" fill="#fff" stroke="#2f7d32" strokeWidth="2.5" strokeDasharray="5 4" />
          <text x="165" y="243" fontSize="14" fontWeight="700" textAnchor="middle" fill="#2f7d32">
            {nt(lang, "ex_f_stamp")}
          </text>
        </svg>
        <div className="space-y-1.5">
          <b>{nt(lang, "ex_title")}</b>
          <ul className="space-y-1 text-muted">
            {(["ex_t1", "ex_t2", "ex_t3", "ex_t4"] as const).map((k) => (
              <li key={k}>• {nt(lang, k)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
