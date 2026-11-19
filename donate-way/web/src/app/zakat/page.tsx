"use client";

import { useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { useLang } from "@/lib/client/i18n";
import { pi } from "@/lib/client/types";

export default function ZakatPage() {
  const { t } = useLang();
  const [assets, setAssets] = useState("");
  const [debts, setDebts] = useState("");
  const [nisab, setNisab] = useState("");
  const [open, setOpen] = useState(false);

  const net = Math.max(0, (Number(assets) || 0) - (Number(debts) || 0));
  const nisabValue = Number(nisab) || 0;
  const due = nisabValue > 0 && net >= nisabValue ? Math.round(net * 0.025 * 100) / 100 : 0;
  const ready = Number(assets) > 0 && nisabValue > 0;

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <h1 className="text-xl font-bold">🧮 {t("zakat_title")}</h1>
        <p className="text-sm text-muted">{t("zakat_sub")}</p>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("zakat_assets")}</span>
          <input className="input" inputMode="decimal" value={assets} onChange={(e) => setAssets(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("zakat_debts")}</span>
          <input className="input" inputMode="decimal" value={debts} onChange={(e) => setDebts(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("zakat_nisab")}</span>
          <input className="input" inputMode="decimal" value={nisab} onChange={(e) => setNisab(e.target.value)} />
        </label>
      </div>

      {ready && (
        <div className="card space-y-3 p-5 text-center">
          {due > 0 ? (
            <>
              <p className="text-muted">{t("zakat_due")}</p>
              <p className="text-3xl font-bold text-brand">{pi(due)}</p>
              <button className="btn btn-primary w-full" onClick={() => setOpen(true)}>
                {t("zakat_give")}
              </button>
            </>
          ) : (
            <p className="text-muted">{t("zakat_below")}</p>
          )}
        </div>
      )}

      {open && <DonateSheet campaignId={null} title={`${t("zakat")} · ${t("general_fund")}`} initialAmount={due} onClose={() => setOpen(false)} />}
    </div>
  );
}
