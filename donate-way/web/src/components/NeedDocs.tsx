"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { compressImage } from "@/lib/client/image";
import { useLang } from "@/lib/client/i18n";
import { nt, needError } from "@/lib/client/need-i18n";
import { MAX_DOCS, type NeedDoc } from "@/lib/client/need-types";
import { ApiError, usePi } from "@/lib/client/pi";

// Upload/remove proof photos of one request. Photos are shrunk in the browser and sent to a private bucket;
// the thumbnails below are short-lived signed links.
export function NeedDocs({ requestId, docs, kind, onChanged }: { requestId: string; docs: NeedDoc[]; kind: string; onChanged: () => void }) {
  const { lang, t } = useLang();
  const { api } = usePi();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = docs.filter((d) => d.kind === kind);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const form = new FormData();
        form.append("file", blob, "proof.webp");
        await api(`/api/need/${requestId}/documents`, { method: "POST", body: form });
      }
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
      onChanged();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string) {
    setError(null);
    await api(`/api/need/${requestId}/documents?doc=${id}`, { method: "DELETE" }).catch((e) =>
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"))
    );
    onChanged();
  }

  return (
    <div className="space-y-3">
      {mine.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {mine.map((d) => (
            <li key={d.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img src={d.url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => remove(d.id)} className="absolute end-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-bg/85 text-danger" aria-label={nt(lang, "proof_remove")}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" id={`docs-${kind}-${requestId}`} onChange={(e) => add(e.target.files)} />
      <label htmlFor={`docs-${kind}-${requestId}`} className={`btn btn-ghost w-full cursor-pointer ${busy || mine.length >= MAX_DOCS ? "pointer-events-none opacity-50" : ""}`}>
        <Icon name="image" size={18} /> {busy ? nt(lang, "saving") : nt(lang, "proof_add")}
      </label>
      <p className="text-xs text-muted">{nt(lang, "proof_count", { n: mine.length, max: MAX_DOCS })}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
