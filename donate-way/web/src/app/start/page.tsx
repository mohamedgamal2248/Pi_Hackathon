"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/CampaignCard";
import { useLang, type TKey } from "@/lib/client/i18n";
import { ApiError, usePi } from "@/lib/client/pi";
import { CATEGORY_KEYS, lines, pi, type Campaign } from "@/lib/client/types";

type MeLite = { organizer: { status: string; review_note: string | null } | null; myCampaigns: Campaign[] };

export default function StartPage() {
  const { t } = useLang();
  const { api, user, signIn, ready } = usePi();
  const [me, setMe] = useState<MeLite | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ category: "health" });
  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const load = useCallback(() => {
    if (user) api<MeLite>("/api/me").then(setMe).catch(() => undefined);
  }, [api, user]);
   
  useEffect(load, [load]);

  const fail = (e: unknown) => setMsg(e instanceof ApiError ? `${t("error_generic")} (${e.message})` : t("error_generic"));

  async function apply() {
    try {
      await api("/api/organizers", {
        method: "POST",
        body: JSON.stringify({ ...form, documents: lines(form.documents ?? "") }),
      });
      setMsg(t("organizer_pending"));
      load();
    } catch (e) {
      fail(e);
    }
  }

  async function create() {
    try {
      await api("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          goal: Number(form.goal),
          gallery: lines(form.gallery ?? ""),
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
          urgent: form.urgent === "1",
        }),
      });
      setForm({ category: "health" });
      setMsg(t("campaign_submitted"));
      load();
    } catch (e) {
      fail(e);
    }
  }

  if (!user)
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-muted">{t("organizer_apply_sub")}</p>
        <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
          {t("sign_in")}
        </button>
      </div>
    );
  if (!me) return <div className="card h-80 animate-pulse bg-surface-2" />;

  const status = me.organizer?.status;

  return (
    <div className="space-y-5">
      {msg && <p className="card p-4 text-sm">{msg}</p>}

      {status !== "approved" && (
        <div className="card space-y-3 p-5">
          <h1 className="text-xl font-bold">{t("organizer_apply")}</h1>
          {status === "pending" ? (
            <p className="text-muted">⏳ {t("organizer_pending")}</p>
          ) : (
            <>
              {status === "rejected" && (
                <p className="text-sm text-danger">
                  {t("organizer_rejected")} {me.organizer?.review_note}
                </p>
              )}
              <p className="text-sm text-muted">{t("organizer_apply_sub")}</p>
              <input className="input" placeholder={t("full_name")} onChange={set("full_name")} />
              <input className="input" placeholder={t("org_name")} onChange={set("org_name")} />
              <input className="input" placeholder={t("country")} onChange={set("country")} />
              <input className="input" placeholder={t("phone")} onChange={set("phone")} dir="ltr" />
              <textarea className="input" rows={3} placeholder={t("bio")} onChange={set("bio")} />
              <textarea className="input" rows={3} placeholder={t("documents")} onChange={set("documents")} dir="ltr" />
              <button className="btn btn-primary w-full" onClick={apply}>
                {t("submit")}
              </button>
            </>
          )}
        </div>
      )}

      {status === "approved" && (
        <div className="card space-y-3 p-5">
          <h1 className="flex items-center gap-2 text-xl font-bold"><Icon name="plus" className="text-brand" /> {t("new_campaign")}</h1>
          <input className="input" placeholder={t("title")} value={form.title ?? ""} onChange={set("title")} maxLength={120} />
          <input className="input" placeholder={t("summary")} value={form.summary ?? ""} onChange={set("summary")} maxLength={280} />
          <textarea className="input" rows={6} placeholder={t("story")} value={form.story ?? ""} onChange={set("story")} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={form.category} onChange={set("category")}>
              {CATEGORY_KEYS.map((c) => (
                <option key={c} value={c}>
                  {t(`cat_${c}` as TKey)}
                </option>
              ))}
            </select>
            <input className="input" placeholder={t("country")} value={form.country ?? ""} onChange={set("country")} />
          </div>
          <input className="input" inputMode="decimal" placeholder={t("goal")} value={form.goal ?? ""} onChange={set("goal")} />
          <input className="input" placeholder={t("cover_url")} value={form.cover_url ?? ""} onChange={set("cover_url")} dir="ltr" />
          <textarea className="input" rows={2} placeholder={t("gallery")} value={form.gallery ?? ""} onChange={set("gallery")} dir="ltr" />
          <input className="input" placeholder={t("video_url")} value={form.video_url ?? ""} onChange={set("video_url")} dir="ltr" />
          <label className="block text-sm">
            <span className="mb-1 block text-muted">{t("deadline")}</span>
            <input className="input" type="date" value={form.deadline ?? ""} onChange={set("deadline")} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.urgent === "1"} onChange={(e) => setForm((f) => ({ ...f, urgent: e.target.checked ? "1" : "" }))} />
            {t("urgent")}
          </label>
          <button className="btn btn-primary w-full" disabled={!form.title || !form.summary || !form.story || !form.country || !Number(form.goal)} onClick={create}>
            {t("submit")}
          </button>
        </div>
      )}

      {me.myCampaigns.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-bold">{t("my_campaigns")}</h2>
          <ul className="divide-y divide-line">
            {me.myCampaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <Link href={`/campaigns/${c.id}`} className="font-bold">
                  {c.title}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-brand">{pi(c.raised)}</span>
                  <StatusBadge c={c} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
