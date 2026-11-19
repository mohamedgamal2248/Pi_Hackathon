import { db, must } from "@/lib/server/db";
import { handler, HttpError, httpsUrl, json, readJson, requireSession, str } from "@/lib/server/http";

// Apply to become a campaign organizer. Pi accounts are already KYC'd humans; the admin also
// reviews the documents (ID, registration papers for charities) before approving.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  const body = await readJson<Record<string, unknown>>(request);
  const existing = must(
    await db().from("dw_organizers").select("status").eq("pi_uid", session.uid).maybeSingle()
  ) as { status: string } | null;
  if (existing?.status === "approved") throw new HttpError(409, "already_approved");

  const documents = Array.isArray(body.documents)
    ? body.documents.slice(0, 5).map((u, i) => httpsUrl(u, `document_${i}`)).filter(Boolean)
    : [];
  if (!documents.length) throw new HttpError(400, "documents_required");

  must(
    await db()
      .from("dw_organizers")
      .upsert(
        {
          pi_uid: session.uid,
          full_name: str(body.full_name, 120, "full_name"),
          org_name: str(body.org_name, 120, "org_name", true),
          country: str(body.country, 60, "country"),
          phone: str(body.phone, 30, "phone", true),
          bio: str(body.bio, 1000, "bio", true),
          documents,
          status: "pending",
          review_note: null,
        },
        { onConflict: "pi_uid" }
      )
  );
  return json({ status: "pending" }, 201);
});
