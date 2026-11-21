import { handler, HttpError, json, rateLimit, requireSession, uuid } from "@/lib/server/http";
import { addDocument, removeDocument } from "@/lib/server/need";

// Proof photos go to a private bucket; the browser compresses them to WebP first.
export const POST = handler(async (request, ctx: RouteContext<"/api/need/[id]/documents">) => {
  const session = requireSession(request);
  rateLimit(`needdoc:${session.uid}`, 20, 60_000);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  if (file.size > 4 * 1024 * 1024) throw new HttpError(413, "file_too_large");
  return json(await addDocument(uuid((await ctx.params).id, "id"), session.uid, new Uint8Array(await file.arrayBuffer())), 201);
});

export const DELETE = handler(async (request, ctx: RouteContext<"/api/need/[id]/documents">) => {
  const session = requireSession(request);
  const doc = new URL(request.url).searchParams.get("doc") ?? "";
  return json(await removeDocument(uuid((await ctx.params).id, "id"), session.uid, doc));
});
