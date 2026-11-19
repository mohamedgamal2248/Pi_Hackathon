"use client";

import { useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";

// Inline "quick donate" card for the home page: neediest/zakat fund + preset amounts.
export function QuickDonate() {
  const { t } = useLang();
  const [fund, setFund] = useState<"general" | "zakat">("general");
  const [amount, setAmount] = useState(5);
  const [open, setOpen] = useState(false);
  const [adMsg, setAdMsg] = useState<string | null>(null);

  async function watchAd() {
    try {
      const res = await window.Pi?.Ads?.showAd("rewarded");
      if (res?.result === "AD_REWARDED") setAdMsg(t("ad_thanks"));
    } catch {
      setAdMsg(t("error_generic"));
    }
  }

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon name="heart" className="text-brand" /> {t("quick_title")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <button className="chip justify-center" data-active={fund === "general"} onClick={() => setFund("general")}>
          {t("quick_neediest")}
        </button>
        <button className="chip justify-center" data-active={fund === "zakat"} onClick={() => setFund("zakat")}>
          {t("quick_zakat")}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 5, 10].map((a) => (
          <button key={a} className="chip justify-center !bg-transparent !ring-1 !ring-line data-[active=true]:!bg-surface-2 data-[active=true]:!text-brand data-[active=true]:!ring-brand" data-active={amount === a} onClick={() => setAmount(a)}>
            <span className="num">{a} π</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{adMsg ?? t("quick_note")}</p>
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={() => setOpen(true)}>
          {t("donate")} {amount} π
        </button>
        <button className="btn btn-ghost" onClick={watchAd} aria-label={t("watch_ad")} title={t("watch_ad")}>
          <Icon name="play" size={18} />
        </button>
      </div>
      {open && (
        <DonateSheet target={{ kind: "fund", fund, title: fund === "zakat" ? t("to_zakat") : t("to_general") }} initialAmount={amount} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
