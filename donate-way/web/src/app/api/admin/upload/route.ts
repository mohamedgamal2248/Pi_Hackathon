import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, HttpError, json, rateLimit, requireAdmin } from "@/lib/server/http";
import { sniffImage as sniff } from "@/lib/server/image";
import { isTestnet } from "@/lib/server/network";

const MAX_BYTES = 4 * 1024 * 1024;

// Admin-only image upload (campaign covers, proof-of-spend receipts) to the public "sanad" bucket.
// The browser compresses the image to WebP first (lib/client/image.ts).
export const POST = handler(async (request) => {
  const session = await requireAdmin(request);
  rateLimit(`upload:${session.uid}`, 30, 60_000);
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
