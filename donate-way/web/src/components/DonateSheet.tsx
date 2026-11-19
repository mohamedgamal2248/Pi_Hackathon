"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { Sheet } from "@/components/Sheet";
import { useLang } from "@/lib/client/i18n";
import { Confetti } from "@/lib/client/motion";
import { ApiError, usePi, type DonationItem } from "@/lib/client/pi";
import { fmt, shareUrl, sharePi, type ImpactUnit } from "@/lib/client/types";

export type DonateTarget =
  | { kind: "campaign"; id: string; title: string; impactUnits?: ImpactUnit[] }
  | { kind: "fund"; fund: "general" | "zakat"; title: string };


const QUICK = [1, 5, 10, 25];
const FEE = 0.05;

export function DonateSheet({
  target,
  initialAmount,
  zakat = false,
  onClose,
  onDone,
}: {
  target: DonateTarget;
  initialAmount?: number;
  zakat?: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t } = useLang();
  const { donate, user, signIn, ready } = usePi();
  const units = target.kind === "campaign" ? target.impactUnits ?? [] : [];

  const [amount, setAmount] = useState(String(initialAmount ? Number(initialAmount.toFixed(4)) : units[0]?.amount ?? 5));
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [giftOn, setGiftOn] = useState(false);
  const [giftType, setGiftType] = useState<"gift" | "memorial">("gift");
  const [giftName, setGiftName] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; txid: string; donationId: string } | null>(null);

  const total = Number(amount);
  const valid = Number.isFinite(total) && total >= 0.01 && (!giftOn || giftName.trim().length > 0);
  const share = Math.round(total * (1 - FEE) * 1e7) / 1e7;
  const fee = Math.round((total - share) * 1e7) / 1e7;
  const title = target.title;
  const noSdk = ready && typeof window !== "undefined" && !window.Pi;

  const items: DonationItem[] = useMemo(() => {
    if (target.kind === "campaign") return [{ campaignId: target.id, amount: Number(amount) }];
    return [{ campaignId: null, fund: target.fund, amount: Number(amount) }];
  }, [target, amount]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        const u = await signIn();
        if (!u) throw new Error("sign_in_required");
      }
      const r = await donate({
        items,
        memo: `Sanad: ${title}`,
        anonymous,
        message,
        zakat: zakat || (target.kind === "fund" && target.fund === "zakat"),
        gift: giftOn ? { type: giftType, name: giftName.trim(), note: giftNote.trim() || undefined } : null,
      });
      setDone({ amount: total, ...r });
      onDone?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "cancelled") setError(null);
      else if (/wallet/i.test(msg) && /misconfigur|not.*set|app wallet/i.test(msg)) setError(t("pay_wallet_missing"));
      else setError(e instanceof ApiError ? `${t("error_generic")} (${e.message})` : `${t("error_generic")}${msg ? ` (${msg.slice(0, 80)})` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Sheet onClose={onClose}>
        <div className="relative space-y-4 pb-2 text-center">
          <Confetti />
          <div className="pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-brand-ink">
            <Icon name="check" size={32} />
          </div>
          <h3 className="text-xl font-bold">{t("thanks_title")}</h3>
          <p className="text-muted">{t("thanks_body")}</p>
          <div className="text-4xl text-brand">
            <Money value={done.amount} animate />
          </div>
          {user?.referralCode && (
            <button className="btn btn-primary w-full" onClick={() => sharePi(t("app_name"), t("invite_text"), shareUrl("/", user.referralCode))}>
              <Icon name="heart" size={18} /> {t("invite_friend")}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/receipt/${done.donationId}`} className="btn btn-ghost" onClick={onClose}>
              <Icon name="receipt" size={18} /> {t("view_receipt")}
            </Link>
            {giftOn ? (
              <button className="btn btn-gold" onClick={() => sharePi(t("app_name"), title, shareUrl(`/gift/${done.donationId}`))}>
                <Icon name="gift" size={18} /> {t("share_gift")}
              </button>
            ) : (
              <button className="btn btn-gold" onClick={() => sharePi(t("app_name"), title, shareUrl(target.kind === "campaign" ? `/campaigns/${target.id}` : "/"))}>
                <Icon name="share" size={18} /> {t("share")}
              </button>
            )}
          </div>
        </div>
      </Sheet>
    );

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-4">
        {(
          <>
            {units.length > 0 && (
              <div>
                <div className="mb-2 text-xs text-muted">{t("impact_units_title")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {units.map((u) => (
                    <button key={u.label} className="chip !h-auto flex-col !items-start !rounded-2xl !py-2.5" data-active={Number(amount) === u.amount} onClick={() => setAmount(String(u.amount))}>
                      <span className="num font-bold">{fmt(u.amount)} π</span>
                      <span className="text-xs opacity-80">= {u.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button key={q} className="chip justify-center" data-active={Number(amount) === q} onClick={() => setAmount(String(q))}>
                  <span className="num">{q} π</span>
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">{t("amount")} (π)</span>
              <input className="input num text-xl font-bold" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            </label>
          </>
        )}

        {total > 0 && (
          <div className="rounded-2xl border border-line p-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted">{t("your_donation")}</span>
              <Money value={total} />
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted">{t("split_campaign")} · 95%</span>
              <span className="num font-bold text-brand">{fmt(share, 4)} π</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{t("split_platform")} · 5%</span>
              <span className="num">{fmt(fee, 4)} π</span>
            </div>
          </div>
        )}

        <textarea className="input" rows={2} maxLength={280} placeholder={t("message_optional")} value={message} onChange={(e) => setMessage(e.target.value)} />

        <div className="space-y-1">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            {t("anonymous")}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={giftOn} onChange={(e) => setGiftOn(e.target.checked)} />
            <Icon name="gift" size={18} className="text-gold" /> {t("gift_toggle")}
          </label>
          {giftOn && (
            <div className="fade-in space-y-2 rounded-2xl bg-surface-2 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button className="chip justify-center" data-active={giftType === "gift"} onClick={() => setGiftType("gift")}>
                  {t("gift_type_gift")}
                </button>
                <button className="chip justify-center" data-active={giftType === "memorial"} onClick={() => setGiftType("memorial")}>
                  {t("gift_type_memorial")}
                </button>
              </div>
              <input className="input" maxLength={60} placeholder={t("gift_name")} value={giftName} onChange={(e) => setGiftName(e.target.value)} />
              <input className="input" maxLength={200} placeholder={t("gift_note")} value={giftNote} onChange={(e) => setGiftNote(e.target.value)} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {noSdk && <p className="text-sm text-muted">{t("use_pi_browser")}</p>}

        <button className="btn btn-primary w-full text-lg" disabled={!valid || busy} onClick={submit}>
          {busy ? t("processing") : `${t("donate")} ${valid ? `${fmt(total)} π` : ""}`}
        </button>
      </div>
    </Sheet>
  );
}
