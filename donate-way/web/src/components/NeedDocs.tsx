"use client";

import { useRef, useState } from "react";
import { DocViewer } from "@/components/DocViewer";
import { Icon } from "@/components/Icon";
import { RedactEditor } from "@/components/RedactEditor";
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
  const [queue, setQueue] = useState<File[]>([]); // photos waiting for the redaction step
  const mine = docs.filter((d) => d.kind === kind);

  // Each chosen photo goes through the redaction editor first, then is uploaded.
  async function upload(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", blob, "proof.webp");
      await api(`/api/need/${requestId}/documents`, { method: "POST", body: form });
    } catch (e) {
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
      setQueue((q) => q.slice(1));
      onChanged();
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
        <div className="space-y-1.5">
          <DocViewer docs={mine.map((d) => ({ id: d.id, url: d.url }))} />
          <ul className="flex flex-wrap gap-2">
            {mine.map((d, i) => (
              <li key={d.id}>
                <button type="button" onClick={() => remove(d.id)} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs text-danger">
                  <Icon name="trash" size={14} /> {nt(lang, "proof_remove")} {i + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" id={`docs-${kind}-${requestId}`} onChange={(e) => {
          setQueue(Array.from(e.target.files ?? []));
          e.target.value = "";
        }} />
      <label htmlFor={`docs-${kind}-${requestId}`} className={`btn btn-ghost w-full cursor-pointer ${busy || mine.length >= MAX_DOCS ? "pointer-events-none opacity-50" : ""}`}>
        <Icon name="image" size={18} /> {busy ? nt(lang, "saving") : nt(lang, "proof_add")}
      </label>
      <p className="text-xs text-muted">{nt(lang, "proof_count", { n: mine.length, max: MAX_DOCS })}</p>
      {queue[0] && <RedactEditor key={queue[0].name + queue.length} file={queue[0]} onDone={upload} onCancel={() => setQueue((q) => q.slice(1))} />}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
