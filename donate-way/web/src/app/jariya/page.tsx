"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi, type Campaign } from "@/lib/client/types";

type MyDonation = { id: string; amount: number; gift: { type: string; name: string; note?: string | null } | null; completed_at: string; campaign_id: string | null; dw_campaigns: { title: string } | null };

// Sadaqa Jariya: a gift in someone's memory, with a shareable certificate and a yearly reminder.
export default function JariyaPage() {
  const { t, lang } = useLang();
  const { api, user, signIn, ready } = usePi();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mine, setMine] = useState<MyDonation[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("fund");
  const [open, setOpen] = useState<{ name: string; note?: string; campaignId?: string | null } | null>(null);

  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/campaigns").then((r) => setCampaigns(r.campaigns.filter((c) => c.status === "active"))).catch(() => undefined);
  }, [api]);
  useEffect(() => {
    if (user) api<{ donations: MyDonation[] }>("/api/me").then((r) => setMine(r.donations.filter((d) => d.gift?.type === "memorial"))).catch(() => undefined);
  }, [api, user, open]);

  const chosen = campaigns.find((c) => c.id === (open?.campaignId ?? target));
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card space-y-3 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon name="gift" className="text-brand" /> {t("jariya")}
        </h1>
        <p className="text-sm text-muted">{t("jariya_sub")}</p>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("jariya_name")}</span>
          <input className="input" maxLength={60} placeholder={t("jariya_name_ph")} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("jariya_note")}</span>
          <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("jariya_where")}</span>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="fund">{t("to_general")}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-primary w-full"
          disabled={!name.trim() || !ready}
          onClick={async () => {
            if (!user && !(await signIn().catch(() => null))) return;
            setOpen({ name: name.trim(), note: note.trim() || undefined, campaignId: target === "fund" ? null : target });
          }}
        >
          {t("jariya_start")}
        </button>
        <p className="text-xs text-muted">{t("jariya_reminder")}</p>
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="font-bold">{t("jariya_mine")}</h2>
        {mine.length === 0 && <p className="text-sm text-muted">{t("jariya_empty")}</p>}
        <ul className="divide-y divide-line">
          {mine.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="min-w-0">
                <b className="block truncate">{d.gift?.name}</b>
                <span className="text-xs text-muted">
                  {date(d.completed_at)} · {pi(d.amount)}
                </span>
              </span>
              <span className="flex gap-2">
                <Link href={`/gift/${d.id}`} className="chip !min-h-9">
                  {t("jariya_cert")}
                </Link>
                <button className="chip !min-h-9 !bg-brand-soft !text-brand" onClick={() => setOpen({ name: d.gift!.name, note: d.gift?.note ?? undefined, campaignId: d.campaign_id })}>
                  {t("jariya_again")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {open && (
        <DonateSheet
          key={open.name + (open.campaignId ?? "")}
          target={chosen ? { kind: "campaign", id: chosen.id, title: chosen.title, impactUnits: chosen.impact_units } : { kind: "fund", fund: "general", title: t("to_general") }}
          presetMemorial={{ name: open.name, note: open.note }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
