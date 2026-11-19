"use client";

import { useState } from "react";
import { useLang } from "@/lib/client/i18n";
import { ApiError, usePi } from "@/lib/client/pi";
import { lines, pi, type CampaignDetail } from "@/lib/client/types";

export function OrganizerTools({ campaign, onChange }: { campaign: CampaignDetail; onChange: () => void }) {
  const { t } = useLang();
  const { api } = usePi();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState("");
  const [isProof, setIsProof] = useState(false);
  const [spent, setSpent] = useState("");
  const [trancheAmount, setTrancheAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const committed = campaign.tranches.filter((x) => x.status !== "rejected").reduce((s, x) => s + x.amount, 0);
  const available = Math.max(0, campaign.raised - committed);
  const latestProof = campaign.updates.find((u) => u.kind === "proof_of_spend");

  const fail = (e: unknown) => setMsg(e instanceof ApiError ? e.message : t("error_generic"));

  async function postUpdate() {
    try {
      await api(`/api/campaigns/${campaign.id}/updates`, {
        method: "POST",
        body: JSON.stringify({ kind: isProof ? "proof_of_spend" : "update", title, body, media: lines(media), amount_spent: isProof ? Number(spent) : undefined }),
      });
      setTitle("");
      setBody("");
      setMedia("");
      setSpent("");
      setMsg("✓");
      onChange();
    } catch (e) {
      fail(e);
    }
  }

  async function requestTranche() {
    try {
      await api(`/api/campaigns/${campaign.id}/tranches`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(trancheAmount), proofUpdateId: latestProof?.id }),
      });
      setTrancheAmount("");
      setMsg("✓");
      onChange();
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div className="card space-y-4 border-gold p-5">
      <h3 className="font-bold">🛠 {t("post_update")}</h3>
      <input className="input" placeholder={t("update_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input" rows={3} placeholder={t("update_body")} value={body} onChange={(e) => setBody(e.target.value)} />
      <textarea className="input" rows={2} placeholder={t("media_urls")} value={media} onChange={(e) => setMedia(e.target.value)} dir="ltr" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isProof} onChange={(e) => setIsProof(e.target.checked)} />
        {t("is_proof")}
      </label>
      {isProof && <input className="input" inputMode="decimal" placeholder={t("amount_spent")} value={spent} onChange={(e) => setSpent(e.target.value)} />}
      <button className="btn btn-primary w-full" disabled={!title || !body} onClick={postUpdate}>
        {t("submit")}
      </button>

      <hr className="border-line" />
      <h3 className="font-bold">💸 {t("request_tranche")}</h3>
      <p className="text-sm text-muted">
        {t("available")}: <b className="text-brand">{pi(available)}</b>
      </p>
      <div className="flex gap-2">
        <input className="input" inputMode="decimal" placeholder={t("amount")} value={trancheAmount} onChange={(e) => setTrancheAmount(e.target.value)} />
        <button className="btn btn-gold" disabled={!Number(trancheAmount)} onClick={requestTranche}>
          {t("request")}
        </button>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
