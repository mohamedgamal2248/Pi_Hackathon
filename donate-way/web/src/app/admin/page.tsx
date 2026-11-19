"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/client/i18n";
import { ApiError, usePi } from "@/lib/client/pi";
import { pi } from "@/lib/client/types";

type Queue = {
  organizers: { id: string; full_name: string; org_name: string | null; country: string; phone: string | null; bio: string | null; documents: string[]; dw_users: { username: string } | null }[];
  campaigns: { id: string; title: string; summary: string; goal: number; country: string; category: string }[];
  tranches: { id: string; amount: number; status: string; note: string | null; campaign_id: string; proof_update_id: string | null; dw_campaigns: { title: string } | null }[];
};

export default function AdminPage() {
  const { t } = useLang();
  const { api, user } = usePi();
  const [q, setQ] = useState<Queue | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (user?.isAdmin) api<Queue>("/api/admin").then(setQ).catch(() => undefined);
  }, [api, user]);
   
  useEffect(load, [load]);

  async function act(type: string, id: string, action: string) {
    const note = action === "reject" ? prompt("Note") ?? undefined : undefined;
    setBusy(id);
    try {
      await api("/api/admin/review", { method: "POST", body: JSON.stringify({ type, id, action, note }) });
      setMsg(`✓ ${type} ${action}`);
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setBusy(null);
    }
  }

  if (!user?.isAdmin) return <p className="py-20 text-center text-muted">403</p>;
  if (!q) return <div className="card h-80 animate-pulse bg-surface-2" />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("admin")}</h1>
      {msg && <p className="card p-3 text-sm">{msg}</p>}

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">Organizers ({q.organizers.length})</h2>
        {q.organizers.map((o) => (
          <div key={o.id} className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <b>
              {o.full_name} {o.org_name && `· ${o.org_name}`}
            </b>{" "}
            <span className="text-muted">
              @{o.dw_users?.username} · {o.country} · {o.phone}
            </span>
            {o.bio && <p>{o.bio}</p>}
            <div className="flex flex-wrap gap-2">
              {o.documents.map((d, i) => (
                <a key={d} href={d} target="_blank" rel="noreferrer" className="text-brand underline">
                  doc {i + 1}
                </a>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary !py-1.5 text-xs" disabled={busy === o.id} onClick={() => act("organizer", o.id, "approve")}>
                {t("approve")}
              </button>
              <button className="btn btn-ghost !py-1.5 text-xs" disabled={busy === o.id} onClick={() => act("organizer", o.id, "reject")}>
                {t("reject")}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">Campaigns ({q.campaigns.length})</h2>
        {q.campaigns.map((c) => (
          <div key={c.id} className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <Link href={`/campaigns/${c.id}`} className="font-bold underline">
              {c.title}
            </Link>
            <p className="text-muted">
              {c.summary} · {pi(Number(c.goal))} · {c.country}
            </p>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary !py-1.5 text-xs" disabled={busy === c.id} onClick={() => act("campaign", c.id, "approve")}>
                {t("approve")}
              </button>
              <button className="btn btn-ghost !py-1.5 text-xs" disabled={busy === c.id} onClick={() => act("campaign", c.id, "reject")}>
                {t("reject")}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">Tranches ({q.tranches.length})</h2>
        {q.tranches.map((tr) => (
          <div key={tr.id} className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <Link href={`/campaigns/${tr.campaign_id}`} className="font-bold underline">
              {tr.dw_campaigns?.title}
            </Link>
            <p>
              {pi(Number(tr.amount))} · {tr.status} {tr.proof_update_id ? "· 🧾 proof attached" : ""}
            </p>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-gold !py-1.5 text-xs" disabled={busy === tr.id} onClick={() => act("tranche", tr.id, "pay")}>
                {t("pay")}
              </button>
              <button className="btn btn-ghost !py-1.5 text-xs" disabled={busy === tr.id} onClick={() => act("tranche", tr.id, "reject")}>
                {t("reject")}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
