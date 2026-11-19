"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminExtras } from "@/components/AdminExtras";
import { StatusBadge } from "@/components/CampaignCard";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang, type TKey } from "@/lib/client/i18n";
import { compressImage } from "@/lib/client/image";
import { ApiError, usePi } from "@/lib/client/pi";
import { CATEGORY_KEYS, pi, type Campaign, type ImpactUnit } from "@/lib/client/types";

type Dash = {
  stats: { total: number; toCampaigns: number; platformFees: number; donors: number; donations: number; released: number };
  today: number;
  funds: { general: number; zakat: number };
  engagement: { active1d: number; active7d: number; active30d: number; new7d: number; returningDonors: number; retention: number; referralDonations: number; activeStreaks: number };
  campaigns: Campaign[];
};

type Form = {
  title: string;
  summary: string;
  story: string;
  category: string;
  goal: string;
  cover_url: string;
  cover_path: string;
  urgent: boolean;
  zakat_eligible: boolean;
  deadline: string;
  status: string;
  impact_units: { amount: string; label: string }[];
};

const EMPTY: Form = {
  title: "",
  summary: "",
  story: "",
  category: "health",
  goal: "",
  cover_url: "",
  cover_path: "",
  urgent: false,
  zakat_eligible: false,
  deadline: "",
  status: "active",
  impact_units: [],
};

function useUpload() {
  const { api } = usePi();
  return useCallback(
    async (file: File, folder: "campaigns" | "proofs") => {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "image.webp", { type: "image/webp" }));
      fd.append("folder", folder);
      return api<{ url: string; path: string }>("/api/admin/upload", { method: "POST", body: fd });
    },
    [api]
  );
}

function CampaignForm({ initial, id, onDone }: { initial: Form; id: string | null; onDone: () => void }) {
  const { t } = useLang();
  const { api } = usePi();
  const upload = useUpload();
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  async function onFile(file?: File) {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const r = await upload(file, "campaigns");
      setF((x) => ({ ...x, cover_url: r.url, cover_path: r.path }));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const body = {
      ...f,
      goal: Number(f.goal),
      deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
      cover_url: f.cover_url || null,
      cover_path: f.cover_path || null,
      impact_units: f.impact_units.filter((u) => u.label.trim() && Number(u.amount) > 0).map((u) => ({ amount: Number(u.amount), label: u.label.trim() })),
    };
    try {
      if (id) await api(`/api/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/admin/campaigns", { method: "POST", body: JSON.stringify(body) });
      setMsg(t("saved"));
      onDone();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card fade-in space-y-4 p-5">
      <h2 className="text-lg font-bold">{id ? t("edit") : t("new_campaign")}</h2>

      <div>
        <span className="mb-1 block text-sm text-muted">{t("cover")}</span>
        <button type="button" onClick={() => fileRef.current?.click()} className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 text-muted hover:border-brand">
          {f.cover_url ? (
            <Image src={f.cover_url} alt="" fill sizes="600px" className="object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm">
              <Icon name="image" size={32} /> {uploading ? t("uploading") : t("upload")}
            </span>
          )}
          {uploading && f.cover_url && <span className="absolute inset-0 grid place-items-center bg-bg/60 text-sm">{t("uploading")}</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("title")}</span>
        <input className="input" maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("summary")}</span>
        <input className="input" maxLength={280} value={f.summary} onChange={(e) => set("summary", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("story_label")}</span>
        <textarea className="input" rows={7} value={f.story} onChange={(e) => set("story", e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("goal")}</span>
          <input className="input num" inputMode="decimal" value={f.goal} onChange={(e) => set("goal", e.target.value.replace(/[^0-9.]/g, ""))} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("category")}</span>
          <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {t(`cat_${c}` as TKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("status")}</span>
          <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {["active", "draft", "paused", "funded", "completed"].map((s) => (
              <option key={s} value={s}>
                {t(s as TKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("deadline")}</span>
        <input className="input" type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={f.urgent} onChange={(e) => set("urgent", e.target.checked)} /> {t("urgent_label")}
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={f.zakat_eligible} onChange={(e) => set("zakat_eligible", e.target.checked)} /> {t("zakat_eligible_label")}
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-sm text-muted">{t("impact_units_admin")}</span>
        {f.impact_units.map((u, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input num w-24"
              inputMode="decimal"
              placeholder={t("unit_amount")}
              value={u.amount}
              onChange={(e) => set("impact_units", f.impact_units.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, "") } : x)))}
            />
            <input className="input flex-1" placeholder={t("unit_label")} value={u.label} onChange={(e) => set("impact_units", f.impact_units.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <button className="grid h-12 w-12 place-items-center rounded-full text-muted hover:text-danger" onClick={() => set("impact_units", f.impact_units.filter((_, j) => j !== i))} aria-label={t("remove")}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        {f.impact_units.length < 6 && (
          <button className="chip" onClick={() => set("impact_units", [...f.impact_units, { amount: "", label: "" }])}>
            + {t("add_unit")}
          </button>
        )}
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" disabled={busy || uploading || !f.title || !f.story || !Number(f.goal)} onClick={save}>
          {t("save")}
        </button>
        <button className="btn btn-ghost" onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </section>
  );
}

function ProofForm({ campaign, onDone }: { campaign: Campaign; onDone: () => void }) {
  const { t } = useLang();
  const { api } = usePi();
  const upload = useUpload();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spent, setSpent] = useState("");
  const [isProof, setIsProof] = useState(true);
  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - media.length)) {
        const r = await upload(file, "proofs");
        setMedia((m) => [...m, r.url]);
      }
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setUploading(false);
    }
  }

  async function post() {
    try {
      await api(`/api/campaigns/${campaign.id}/updates`, {
        method: "POST",
        body: JSON.stringify({ kind: isProof ? "proof_of_spend" : "update", title, body, media, amount_spent: isProof ? Number(spent) : undefined }),
      });
      setMsg(t("saved"));
      onDone();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("error_generic"));
    }
  }

  return (
    <section className="card fade-in space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <Icon name="receipt" className="text-gold" /> {t("post_update")}
      </h2>
      <p className="text-sm text-muted">{campaign.title}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={isProof} onChange={(e) => setIsProof(e.target.checked)} /> {t("is_proof")}
      </label>
      <input className="input" placeholder={t("update_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input" rows={3} placeholder={t("update_body")} value={body} onChange={(e) => setBody(e.target.value)} />
      {isProof && <input className="input num" inputMode="decimal" placeholder={t("amount_spent")} value={spent} onChange={(e) => setSpent(e.target.value.replace(/[^0-9.]/g, ""))} />}
      <div>
        <span className="mb-1 block text-sm text-muted">{t("media_upload")}</span>
        <div className="grid grid-cols-4 gap-2">
          {media.map((m) => (
            <div key={m} className="relative aspect-square overflow-hidden rounded-xl">
              <Image src={m} alt="" fill sizes="120px" className="object-cover" />
            </div>
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted hover:border-brand">
            {uploading ? "…" : <Icon name="image" />}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" disabled={!title || !body || uploading || (isProof && (!media.length || !Number(spent)))} onClick={post}>
          {t("submit_post")}
        </button>
        <button className="btn btn-ghost" onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </section>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const { api, user, signIn, ready } = usePi();
  const [d, setD] = useState<Dash | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [proofFor, setProofFor] = useState<Campaign | null>(null);

  const load = useCallback(() => {
    if (user?.isAdmin) api<Dash>("/api/admin").then(setD).catch(() => undefined);
  }, [api, user]);
   
  useEffect(load, [load]);

  async function openEdit(c: Campaign) {
    const r = await api<{ campaign: Campaign & { story: string } }>(`/api/admin/campaigns/${c.id}`);
    const x = r.campaign;
    setProofFor(null);
    setEditing({
      id: x.id,
      form: {
        title: x.title,
        summary: x.summary ?? "",
        story: x.story ?? "",
        category: x.category,
        goal: String(x.goal),
        cover_url: x.cover_url ?? "",
        cover_path: "",
        urgent: x.urgent,
        zakat_eligible: x.zakat_eligible,
        deadline: x.deadline ? x.deadline.slice(0, 10) : "",
        status: x.status,
        impact_units: (x.impact_units ?? []).map((u: ImpactUnit) => ({ amount: String(u.amount), label: u.label })),
      },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!user)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
          {t("sign_in")}
        </button>
      </div>
    );
  if (!user.isAdmin) return <p className="py-20 text-center text-muted">403</p>;
  if (!d) return <div className="card h-80 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin_title")}</h1>
        {!editing && (
          <button className="btn btn-primary" onClick={() => (setProofFor(null), setEditing({ id: null, form: EMPTY }))}>
            + {t("new_campaign")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-muted">{t("total_raised")}</div>
          <div className="text-xl">
            <Money value={d.stats.total} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("to_campaigns")}</div>
          <div className="text-xl text-brand">
            <Money value={d.stats.toCampaigns} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("platform_fees")}</div>
          <div className="text-xl text-gold">
            <Money value={d.stats.platformFees} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("today")}</div>
          <div className="text-xl">
            <Money value={d.today} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("fund_general")}</div>
          <div className="num text-lg font-bold">{pi(d.funds.general)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("fund_zakat")}</div>
          <div className="num text-lg font-bold">{pi(d.funds.zakat)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("donors")}</div>
          <div className="num text-lg font-bold">{d.stats.donors}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("spent_with_proof")}</div>
          <div className="num text-lg font-bold">{pi(d.stats.released)}</div>
        </div>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">{t("engagement")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["m_active_1d", d.engagement.active1d],
              ["m_active_7d", d.engagement.active7d],
              ["m_active_30d", d.engagement.active30d],
              ["m_new_7d", d.engagement.new7d],
              ["m_returning", d.engagement.returningDonors],
              ["m_retention", `${Math.round(d.engagement.retention * 100)}%`],
              ["m_referrals", d.engagement.referralDonations],
              ["m_streaks", d.engagement.activeStreaks],
            ] as [TKey, number | string][]
          ).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface-2 p-3">
              <div className="text-xs text-muted">{t(k)}</div>
              <div className="num text-xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <CampaignForm
          key={editing.id ?? "new"}
          initial={editing.form}
          id={editing.id}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {proofFor && (
        <ProofForm
          campaign={proofFor}
          onDone={() => {
            setProofFor(null);
            load();
          }}
        />
      )}

      <AdminExtras campaigns={d.campaigns} />

      <section className="card divide-y divide-line">
        {d.campaigns.length === 0 && <p className="p-6 text-center text-muted">{t("empty")}</p>}
        {d.campaigns.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">{c.cover_url && <Image src={c.cover_url} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <Link href={`/campaigns/${c.id}`} className="line-clamp-1 font-bold">
                {c.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusBadge c={c} />
                {c.status === "active" && !c.urgent && <span>{t("active")}</span>}
                <span className="num">
                  {pi(c.raised)} / {pi(c.goal)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost !min-h-10 !px-3 text-sm" onClick={() => (setEditing(null), setProofFor(c), window.scrollTo({ top: 0, behavior: "smooth" }))}>
                <Icon name="receipt" size={16} /> {t("proof_of_spend")}
              </button>
              <button className="btn btn-ghost !min-h-10 !px-3 text-sm" onClick={() => openEdit(c)} aria-label={t("edit")}>
                <Icon name="edit" size={16} />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
