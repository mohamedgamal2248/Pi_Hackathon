"use client";

import { useCallback, useEffect, useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { useCountUp } from "@/lib/client/motion";
import { ApiError, usePi } from "@/lib/client/pi";
import { fmt, pi, usd, type Campaign } from "@/lib/client/types";

type Zakat = {
  address: string;
  walletExists: boolean;
  pi: number;
  others: { code: string; balance: number; usdValue: number | null }[];
  prices: { piUsd: number; goldGramUsd: number; at: string };
  totalUsd: number;
  goldGrams: number;
  nisab: { grams: number; usd: number; pi: number };
  aboveNisab: boolean;
  zakat: { usd: number; pi: number };
  hawl: { start: string; daysLeft: number; complete: boolean } | null;
};

function GoldMeter({ grams, nisab }: { grams: number; nisab: number }) {
  const pct = Math.min(100, (grams / nisab) * 100);
  const shown = useCountUp(grams);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="num text-2xl font-bold text-gold">{fmt(shown)} g</span>
        <span className="num text-muted">/ {nisab} g</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gold transition-[width] duration-1000 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ZakatPage() {
  const { t, lang } = useLang();
  const { api, user, signIn, ready, linkWallet } = usePi();
  const [noWallet, setNoWallet] = useState(false);
  const [manual, setManual] = useState("");
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [z, setZ] = useState<Zakat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hawlAnswer, setHawlAnswer] = useState<"yes" | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [target, setTarget] = useState<string>("fund");

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    api<Zakat>("/api/zakat")
      .then(setZ)
      .then(() => setNoWallet(false))
      .catch((e) => {
        if (e instanceof ApiError && e.message === "no_wallet") setNoWallet(true);
        else setError(t("error_generic"));
      })
      .finally(() => setLoading(false));
  }, [api, user, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- calculate automatically once signed in
  useEffect(load, [load]);

  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/campaigns?zakat=1").then((r) => setCampaigns(r.campaigns.filter((c) => c.status === "active"))).catch(() => undefined);
  }, [api]);

  async function startHawl() {
    await api("/api/zakat", { method: "POST", body: JSON.stringify({ action: "start" }) });
    load();
  }

  const date = (d: string) => new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG-u-ca-islamic" : "en-GB-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });
  const canPay = z?.aboveNisab && (hawlAnswer === "yes" || z.hawl?.complete);
  const chosen = campaigns.find((c) => c.id === target);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="stagger space-y-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon name="calc" className="text-brand" /> {t("zakat_title")}
        </h1>
        <div className="card flex gap-3 border-gold/30 bg-gold-soft/40 p-4 text-sm leading-relaxed">
          <Icon name="award" className="mt-0.5 shrink-0 text-gold" />
          <p>{t("zakat_definition")}</p>
        </div>
      </div>

      {!user && (
        <div className="card space-y-4 p-6 text-center">
          <Icon name="wallet" size={36} className="mx-auto text-brand" />
          <p className="text-muted">{t("zakat_sign_in")}</p>
          <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
            {t("sign_in")}
          </button>
        </div>
      )}

      {user && loading && !z && (
        <div className="card flex items-center gap-3 p-6 text-muted">
          <span className="live-dot h-3 w-3 rounded-full bg-brand" /> {t("zakat_reading")}
        </div>
      )}
      {error && <p className="card p-4 text-sm text-danger">{error}</p>}

      {user && noWallet && (
        <section className="card fade-in space-y-3 p-5">
          <p className="flex items-start gap-2 text-sm text-muted">
            <Icon name="wallet" size={18} className="mt-0.5 shrink-0 text-brand" /> {t("zakat_no_wallet")}
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              setWalletMsg(null);
              const ok = await linkWallet().catch(() => false);
              if (ok) load();
              else setWalletMsg(t("wallet_invalid"));
            }}
          >
            <Icon name="wallet" size={18} /> {t("wallet_read")}
          </button>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">{t("wallet_manual")}</span>
            <div className="flex gap-2">
              <input className="input num" dir="ltr" placeholder="G…" value={manual} onChange={(e) => setManual(e.target.value.trim().toUpperCase())} />
              <button
                className="btn btn-ghost"
                disabled={!/^G[A-Z2-7]{55}$/.test(manual)}
                onClick={async () => {
                  setWalletMsg(null);
                  const ok = await linkWallet(manual).catch(() => false);
                  if (ok) load();
                  else setWalletMsg(t("wallet_invalid"));
                }}
              >
                {t("wallet_save")}
              </button>
            </div>
          </label>
          {walletMsg && <p className="text-sm text-danger">{walletMsg}</p>}
        </section>
      )}

      {z && (
        <>
          <section className="card fade-in space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm text-muted">
              <span className="flex items-center gap-2">
                <Icon name="wallet" size={18} /> {t("zakat_wallet")}
              </span>
              <span className="num">{z.address}</span>
            </div>
            <div className="text-4xl text-ink">
              <Money value={z.pi} animate />
            </div>
            <div>
              <div className="mb-2 text-sm text-muted">{t("zakat_equals_gold", { grams: fmt(z.goldGrams) })}</div>
              <GoldMeter grams={z.goldGrams} nisab={z.nisab.grams} />
              <div className="mt-2 text-xs text-muted">{t("zakat_nisab", { pi: `${fmt(z.nisab.pi, 0)} π (${usd(z.nisab.usd)})` })}</div>
            </div>

            {z.others.length > 0 && (
              <div className="rounded-2xl bg-surface-2 p-3 text-sm">
                <div className="mb-1 text-xs text-muted">{t("zakat_other_tokens")}</div>
                {z.others.map((o) => (
                  <div key={o.code} className="flex justify-between py-0.5">
                    <span className="num">
                      {fmt(o.balance)} {o.code}
                    </span>
                    <span className="text-xs text-muted">{o.usdValue == null ? t("zakat_no_price") : usd(o.usdValue)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!z.aboveNisab ? (
            <section className="card fade-in p-5 text-center text-muted">{t("zakat_below")}</section>
          ) : (
            <section className="card fade-in space-y-5 p-5 sm:p-6">
              <div className="text-center">
                <div className="text-sm text-muted">{t("zakat_due")} (2.5%)</div>
                <div className="text-5xl text-brand">
                  <Money value={z.zakat.pi} animate usdClassName="!text-base" />
                </div>
              </div>

              {z.hawl && !z.hawl.complete ? (
                <div className="space-y-2 rounded-2xl bg-surface-2 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={18} className="text-brand" /> {t("zakat_hawl_started", { date: date(z.hawl.start) })}
                  </div>
                  <div className="font-bold">{t("zakat_days_left", { days: z.hawl.daysLeft })}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full bg-brand" style={{ width: `${((354 - z.hawl.daysLeft) / 354) * 100}%` }} />
                  </div>
                  <button className="text-xs text-muted underline" onClick={() => setHawlAnswer("yes")}>
                    {t("zakat_hawl_yes")}
                  </button>
                </div>
              ) : z.hawl?.complete ? (
                <p className="flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm text-brand">
                  <Icon name="check" size={18} /> {t("zakat_hawl_done")}
                </p>
              ) : hawlAnswer !== "yes" ? (
                <div className="space-y-3">
                  <p className="text-center font-bold">{t("zakat_hawl_q")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="btn btn-primary" onClick={() => setHawlAnswer("yes")}>
                      {t("zakat_hawl_yes")}
                    </button>
                    <button className="btn btn-ghost" onClick={startHawl}>
                      {t("zakat_hawl_no")}
                    </button>
                  </div>
                </div>
              ) : null}

              {canPay && (
                <div className="fade-in space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted">{t("monthly_campaign")}</span>
                    <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="fund">{t("to_zakat")}</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-primary w-full text-lg" onClick={() => setPayOpen(true)}>
                    {t("zakat_pay")} {pi(z.zakat.pi)}
                  </button>
                  <p className="text-center text-xs text-muted">{t("zakat_paid_restart")}</p>
                </div>
              )}
            </section>
          )}

          <p className="text-center text-xs leading-relaxed text-muted">
            {t("zakat_prices_note")} · Pi = {usd(z.prices.piUsd)} · 1g = {usd(z.prices.goldGramUsd)}
            <br />
            {t("zakat_disclaimer")}
          </p>
        </>
      )}

      {payOpen && z && (
        <DonateSheet
          target={chosen ? { kind: "campaign", id: chosen.id, title: chosen.title } : { kind: "fund", fund: "zakat", title: t("to_zakat") }}
          initialAmount={z.zakat.pi}
          zakat
          onClose={() => setPayOpen(false)}
          onDone={() => {
            api("/api/zakat", { method: "POST", body: JSON.stringify({ action: "start" }) }).then(load).catch(() => undefined);
            setHawlAnswer(null);
          }}
        />
      )}
    </div>
  );
}
