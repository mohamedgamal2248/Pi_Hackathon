"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi, type Campaign } from "@/lib/client/types";

type Ch = { id: string; title: string; goal: number; raised: number; ends_at: string; campaign_title: string | null };
type Mt = { id: string; sponsor: string; multiplier: number; cap: number; ends_at: string; dw_campaigns: { title: string } | null };
type Rep = { id: string; reason: string; status: string; created_at: string; campaign_id: string; dw_campaigns: { title: string } | null };

// Admin: community challenges and user reports.
export function AdminExtras({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useLang();
  const { api } = usePi();
  const [ch, setCh] = useState<Ch[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [form, setForm] = useState({ title: "", description: "", goal: "", campaign_id: "", hours: "48" });
  const [matches, setMatches] = useState<Mt[]>([]);
  const [mf, setMf] = useState({ campaign_id: "", sponsor: "", multiplier: "0.5", cap: "", hours: "72" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ challenges: Ch[] }>("/api/admin/challenges").then((r) => setCh(r.challenges)).catch(() => undefined);
    api<{ matches: Mt[] }>("/api/admin/matches").then((r) => setMatches(r.matches)).catch(() => undefined);
    api<{ reports: Rep[] }>("/api/admin/reports").then((r) => setReps(r.reports)).catch(() => undefined);
  }, [api]);
  useEffect(load, [load]);

  async function create() {
    setBusy(true);
    try {
      await api("/api/admin/challenges", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          goal: Number(form.goal),
          campaign_id: form.campaign_id || null,
          ends_at: new Date(Date.now() + Number(form.hours) * 3_600_000).toISOString(),
        }),
      });
      setForm({ title: "", description: "", goal: "", campaign_id: "", hours: "48" });
      load();
    } finally {
      setBusy(false);
    }
  }
  async function createMatch() {
    setBusy(true);
    try {
      await api("/api/admin/matches", { method: "POST", body: JSON.stringify({ campaign_id: mf.campaign_id, sponsor: mf.sponsor, multiplier: Number(mf.multiplier), cap: Number(mf.cap), hours: Number(mf.hours) }) });
      setMf({ campaign_id: "", sponsor: "", multiplier: "0.5", cap: "", hours: "72" });
      load();
    } finally {
      setBusy(false);
    }
  }
  const mok = mf.campaign_id && mf.sponsor.trim() && Number(mf.multiplier) > 0 && Number(mf.multiplier) <= 2 && Number(mf.cap) > 0 && Number(mf.hours) > 0;
  const ok = form.title.trim().length > 1 && Number(form.goal) > 0 && Number(form.hours) > 0;

  return (
    <>
      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="flame" className="text-brand" /> {t("admin_challenges")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder={t("title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder={t("summary")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input num" inputMode="decimal" placeholder="π" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value.replace(/[^0-9.]/g, "") })} />
          <input className="input num" inputMode="numeric" placeholder="h" aria-label={t("ends_at")} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value.replace(/[^0-9]/g, "") })} />
          <select className="input sm:col-span-2" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
            <option value="">{t("to_general")}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary w-full" disabled={!ok || busy} onClick={create}>
          {t("admin_new_challenge")}
        </button>
        <ul className="divide-y divide-line text-sm">
          {ch.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <b className="block truncate">{c.title}</b>
                <span className="num text-xs text-muted">
                  {pi(c.raised)} / {pi(c.goal)} · {new Date(c.ends_at).toLocaleString()}
                </span>
              </span>
              <button
                className="text-xs text-danger underline"
                onClick={() => api(`/api/admin/challenges?id=${c.id}`, { method: "DELETE" }).then(load).catch(() => undefined)}
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="heart" className="text-brand" /> {t("match_admin")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="input sm:col-span-2" value={mf.campaign_id} onChange={(e) => setMf({ ...mf, campaign_id: e.target.value })}>
            <option value="">—</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input className="input" placeholder={t("match_sponsor")} value={mf.sponsor} onChange={(e) => setMf({ ...mf, sponsor: e.target.value })} />
          <input className="input num" inputMode="decimal" placeholder={t("match_x")} value={mf.multiplier} onChange={(e) => setMf({ ...mf, multiplier: e.target.value.replace(/[^0-9.]/g, "") })} />
          <input className="input num" inputMode="decimal" placeholder={t("match_cap")} value={mf.cap} onChange={(e) => setMf({ ...mf, cap: e.target.value.replace(/[^0-9.]/g, "") })} />
          <input className="input num" inputMode="numeric" placeholder={t("match_hours")} value={mf.hours} onChange={(e) => setMf({ ...mf, hours: e.target.value.replace(/[^0-9]/g, "") })} />
        </div>
        <button className="btn btn-primary w-full" disabled={!mok || busy} onClick={createMatch}>
          {t("match_admin")}
        </button>
        <ul className="divide-y divide-line text-sm">
          {matches.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <b className="block truncate">{m.dw_campaigns?.title}</b>
                <span className="num text-xs text-muted">
                  {m.sponsor} · x{m.multiplier} · {pi(m.cap)} · {new Date(m.ends_at).toLocaleString()}
                </span>
              </span>
              <button className="text-xs text-danger underline" onClick={() => api(`/api/admin/matches?id=${m.id}`, { method: "DELETE" }).then(load).catch(() => undefined)}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="shield" className="text-gold" /> {t("admin_reports")}
        </h2>
        {reps.length === 0 && <p className="text-sm text-muted">{t("admin_no_reports")}</p>}
        <ul className="divide-y divide-line text-sm">
          {reps.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0">
                <Link href={`/campaigns/${r.campaign_id}`} className="block truncate font-bold">
                  {r.dw_campaigns?.title}
                </Link>
                <span className="text-muted">{r.reason}</span>
              </span>
              {r.status === "open" ? (
                <button className="chip !min-h-8 shrink-0 text-xs" onClick={() => api("/api/admin/reports", { method: "PATCH", body: JSON.stringify({ id: r.id, status: "resolved" }) }).then(load).catch(() => undefined)}>
                  {t("admin_resolve")}
                </button>
              ) : (
                <Icon name="check" className="text-brand" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
