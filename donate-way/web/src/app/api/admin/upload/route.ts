import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, HttpError, json, requireAdmin } from "@/lib/server/http";
import { isTestnet } from "@/lib/server/network";

const MAX_BYTES = 4 * 1024 * 1024;

// Checks the file's first bytes, not just the declared type.
function sniff(buf: Uint8Array): { ext: string; type: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" };
  if (String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

// Admin-only image upload (campaign covers, proof-of-spend receipts) to the public "sanad" bucket.
// The browser compresses the image to WebP first (lib/client/image.ts).
export const POST = handler(async (request) => {
  await requireAdmin(request);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  if (file.size > MAX_BYTES) throw new HttpError(413, "file_too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new HttpError(415, "images_only");

  const folder = form?.get("folder") === "proofs" ? "proofs" : "campaigns";
  const path = `${isTestnet() ? "staging/" : ""}${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${kind.ext}`;
  const { error } = await db().storage.from("sanad").upload(path, bytes, { contentType: kind.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return json({ path, url: `${env.supabaseUrl()}/storage/v1/object/public/sanad/${path}` }, 201);
});
