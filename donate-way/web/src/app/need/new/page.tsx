"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DocExample } from "@/components/DocExample";
import { Icon } from "@/components/Icon";
import { NeedDocs } from "@/components/NeedDocs";
import { useLang } from "@/lib/client/i18n";
import { nt, needError, type NeedKey } from "@/lib/client/need-i18n";
import { CLOSED_STATUSES, type NeedConfig, type NeedReq } from "@/lib/client/need-types";
import { ApiError, usePi } from "@/lib/client/pi";

type Resp = { config: NeedConfig; requests: NeedReq[]; verified: boolean };

export default function NewNeedPage() {
  const { lang, t } = useLang();
  const { api, user, signIn, payNeedFee, ready } = usePi();
  const router = useRouter();
  const [data, setData] = useState<Resp | null>(null);
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<NeedReq["caseType"]>("treatment");
  const [amount, setAmount] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [description, setDescription] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<Resp>("/api/need").catch(() => null);
    if (r) setData(r);
    return r;
  }, [api]);

  // Resume an existing draft; any other active request lives on /need/mine.
  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once the SDK is ready and when the user changes
    load().then((r) => {
      const active = r?.requests.find((x) => !CLOSED_STATUSES.includes(x.status));
      if (active && active.status !== "draft") return router.replace("/need/mine");
      if (active) {
        setDraftId(active.id);
        setCaseType(active.caseType);
        setAmount(String(active.amount));
        setWindowDays(active.windowDays);
        setDescription(active.description);
        setAgree(active.termsAccepted);
        setStep(active.docs.length ? 3 : 2);
      }
    });
  }, [ready, user, load, router]);

  const draft = data?.requests.find((r) => r.id === draftId) ?? null;
  const cfg = data?.config;
  const max = cfg?.caseTypes.find((c) => c.type === caseType)?.max ?? 0;
  const amountNum = Number(amount);
  const step1Ok = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= max;
  const step2Ok = description.trim().length >= 20 && description.trim().length <= 800;
  const docsCount = draft?.docs.filter((d) => d.kind === "proof").length ?? 0;

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "cancelled") return setError(null);
    setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : `${t("error_generic")} (${msg.slice(0, 80)})`);
  };

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      const body = JSON.stringify({ caseType, amount: amountNum, windowDays, description });
      if (draftId) await api(`/api/need/${draftId}`, { method: "PATCH", body });
      else setDraftId((await api<{ id: string }>("/api/need", { method: "POST", body })).id);
      await load();
      setAgree(false); // changed terms-relevant fields: the box must be ticked again
      setStep(3);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/need/${draftId}/terms`, { method: "POST" });
      await payNeedFee(draftId);
      router.push("/need/mine?sent=1");
    } catch (e) {
      fail(e);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!user)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
        <Icon name="shield" size={36} className="mx-auto text-brand" />
        <h1 className="text-xl font-bold">{nt(lang, "new_title")}</h1>
        <p className="text-muted">{nt(lang, "sign_in_needed")}</p>
        <button className="btn btn-primary w-full" onClick={() => signIn()}>
          {t("sign_in")}
        </button>
      </div>
    );

  const proofKey = `proof_${caseType}` as NeedKey;
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{nt(lang, "new_title")}</h1>
        <Link href="/need/mine" className="text-sm text-brand underline">
          {nt(lang, "mine_link")}
        </Link>
      </div>

      <p className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${data?.verified ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"}`}>
        <Icon name="shield" size={18} /> {data?.verified ? nt(lang, "verified_yes") : nt(lang, "verified_unknown")}
      </p>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>{nt(lang, "step", { n: step })}</span>
          <span>{nt(lang, `s${step}` as NeedKey)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2" role="progressbar" aria-valuenow={step * 25} aria-valuemin={0} aria-valuemax={100} aria-label={nt(lang, "step", { n: step })}>
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${step * 25}%` }} />
        </div>
      </div>

      {step === 1 && (
        <section className="card space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={nt(lang, "s1")}>
            {(["treatment", "hospital_bill", "study_fees"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={caseType === k} className="chip justify-center py-3" data-active={caseType === k} onClick={() => setCaseType(k)}>
                {nt(lang, `type_${k}` as NeedKey)}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{nt(lang, "proof_need", { what: nt(lang, proofKey) })}</p>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{nt(lang, "amount_label")}</span>
            <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            <span className="block text-xs text-muted">{nt(lang, "max_note", { max })}</span>
          </label>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-bold">{nt(lang, "window_label")}</legend>
            <div className="flex gap-2">
              {(cfg?.windows ?? [1, 7, 30]).map((w) => (
                <button key={w} type="button" aria-pressed={windowDays === w} className="chip" data-active={windowDays === w} onClick={() => setWindowDays(w)}>
                  {nt(lang, `w_${w}` as NeedKey)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{nt(lang, "window_note")}</p>
          </fieldset>
          <button className="btn btn-primary w-full" disabled={!step1Ok} onClick={() => setStep(2)}>
            {nt(lang, "next")}
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="card space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{nt(lang, "desc_label")}</span>
            <textarea className="input min-h-40" maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} />
            <span className="block text-xs text-muted">
              {nt(lang, "desc_hint")} · {description.trim().length}/800
            </span>
          </label>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              {nt(lang, "back")}
            </button>
            <button className="btn btn-primary flex-1" disabled={!step2Ok || busy} onClick={saveDraft}>
              {busy ? nt(lang, "saving") : nt(lang, "next")}
            </button>
          </div>
        </section>
      )}

      {step === 3 && draftId && (
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">{nt(lang, "proof_title")}</h2>
          <p className="text-sm text-muted">{nt(lang, "proof_need", { what: nt(lang, proofKey) })}</p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Icon name="lock" size={16} /> {nt(lang, "proof_private")}
          </p>
          <DocExample caseType={caseType} />
          <NeedDocs requestId={draftId} docs={draft?.docs ?? []} kind="proof" onChanged={load} />
          {docsCount === 0 && <p className="text-xs text-muted">{nt(lang, "proof_min")}</p>}
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              {nt(lang, "back")}
            </button>
            <button className="btn btn-primary flex-1" disabled={docsCount === 0} onClick={() => setStep(4)}>
              {nt(lang, "next")}
            </button>
          </div>
        </section>
      )}

      {step === 4 && draftId && (
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">{nt(lang, "fee_title")}</h2>
          <p className="text-sm text-muted">{nt(lang, "fee_what")}</p>
          <ul className="space-y-2 text-sm">
            {(["fee_t1", "fee_t2", "fee_t3", "fee_t4"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand" /> {nt(lang, k)}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{nt(lang, "fee_check")}</span>
          </label>
          <div className="rounded-2xl border border-line p-3 text-sm">
            <b>{nt(lang, "after_title")}</b>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-muted">
              <li>{nt(lang, "after_1")}</li>
              <li>{nt(lang, "after_2")}</li>
              <li>{nt(lang, "after_3")}</li>
            </ol>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(3)} disabled={busy}>
              {nt(lang, "back")}
            </button>
            <button className="btn btn-primary flex-1" disabled={!agree || busy} onClick={pay}>
              {busy ? nt(lang, "paying") : nt(lang, "pay_fee")}
            </button>
          </div>
        </section>
      )}
      {step !== 4 && error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
