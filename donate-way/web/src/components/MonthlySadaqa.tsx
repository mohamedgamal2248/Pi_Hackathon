"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import type { Campaign } from "@/lib/client/types";

// Monthly sadaqa: the form is there (campaign + amount) but the button is disabled until
// Pi smart-contract subscriptions reach Mainnet. Nothing is charged from here.
export function MonthlySadaqa({ campaigns, defaultId }: { campaigns: Pick<Campaign, "id" | "title">[]; defaultId?: string }) {
  const { t } = useLang();
  const [id, setId] = useState(defaultId ?? campaigns[0]?.id ?? "");
  const [amount, setAmount] = useState("5");
  return (
    <section className="card space-y-3 p-5" aria-labelledby="monthly-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="monthly-title" className="flex items-center gap-2 font-bold">
          <Icon name="repeat" size={18} className="text-brand" /> {t("monthly_title")}
        </h2>
        <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">{t("coming_soon")}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">{t("monthly_campaign")}</span>
          <select className="input" value={id} onChange={(e) => setId(e.target.value)}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">{t("monthly_amount")}</span>
          <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </label>
      </div>
      <button className="btn btn-ghost w-full" disabled aria-disabled="true">
        <Icon name="lock" size={16} /> {t("coming_soon")}
      </button>
      <p className="text-[11px] leading-relaxed text-muted">{t("monthly_note")}</p>
    </section>
  );
}
