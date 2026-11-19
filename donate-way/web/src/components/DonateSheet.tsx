"use client";

import { useState } from "react";
import { useLang } from "@/lib/client/i18n";
import { ApiError, usePi } from "@/lib/client/pi";
import { pi, shareUrl } from "@/lib/client/types";

const QUICK = [1, 5, 10, 25];

type Props = {
  campaignId: string | null;
  title: string;
  initialAmount?: number;
  onClose: () => void;
  onDone?: () => void;
};

export function DonateSheet({ campaignId, title, initialAmount, onClose, onDone }: Props) {
  const { t } = useLang();
  const { donate, api } = usePi();
  const [amount, setAmount] = useState(String(initialAmount ?? 5));
  const [anonymous, setAnonymous] = useState(false);
  const [monthly, setMonthly] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; txid: string } | null>(null);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 0.01;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let recurringId: string | null = null;
      if (monthly) {
        const r = await api<{ id: string }>("/api/recurring", { method: "POST", body: JSON.stringify({ amount: value, campaignId }) });
        recurringId = r.id;
      }
      const { txid } = await donate({ amount: value, campaignId, memo: `Donate Way: ${title}`, anonymous, message, recurringId });
      setDone({ amount: value, txid });
      onDone?.();
    } catch (e) {
      if (e instanceof Error && e.message === "cancelled") setError(null);
      else setError(e instanceof ApiError ? `${t("error_generic")} (${e.message})` : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  function share() {
    const text = `${t("thanks_title")} ${title}`;
    const url = shareUrl(campaignId ? `/campaigns/${campaignId}` : "/");
    if (window.Pi?.openShareDialog) window.Pi.openShareDialog(t("app_name"), `${text}\n${url}`);
    else navigator.share?.({ title: t("app_name"), text, url }).catch(() => undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="card w-full max-w-md rounded-b-none p-5 sm:rounded-b-[18px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {done ? (
          <div className="space-y-4 py-4 text-center">
            <div className="text-5xl">🤍</div>
            <h3 className="text-xl font-bold">{t("thanks_title")}</h3>
            <p className="text-muted">{t("thanks_body")}</p>
            <p className="text-2xl font-bold text-brand">{pi(done.amount)}</p>
            <a
              className="block truncate text-xs text-muted underline"
              href={`https://blockexplorer.minepi.com/mainnet/transactions/${done.txid}`}
              target="_blank"
              rel="noreferrer"
            >
              {done.txid}
            </a>
            <div className="flex gap-2">
              <button className="btn btn-gold flex-1" onClick={share}>
                {t("share")}
              </button>
              <button className="btn btn-ghost flex-1" onClick={onClose}>
                {t("close")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold leading-snug">{title}</h3>
              <button onClick={onClose} className="text-muted" aria-label={t("close")}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button key={q} className="chip !py-2" data-active={Number(amount) === q} onClick={() => setAmount(String(q))}>
                  {q} π
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">{t("amount")} (π)</span>
              <input className="input text-lg font-bold" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            </label>
            <textarea className="input" rows={2} maxLength={280} placeholder={t("message_optional")} value={message} onChange={(e) => setMessage(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              {t("anonymous")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
              {t("monthly")} 🔁
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn btn-primary w-full text-lg" disabled={!valid || busy} onClick={submit}>
              {busy ? t("processing") : `${t("donate")} ${valid ? pi(value) : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
