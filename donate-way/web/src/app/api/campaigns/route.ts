import { CATEGORIES, listCampaigns } from "@/lib/server/campaigns";
import { db, must } from "@/lib/server/db";
import { handler, HttpError, httpsUrl, json, positiveAmount, readJson, requireSession, str } from "@/lib/server/http";

export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const campaigns = await listCampaigns({
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });
  return json({ campaigns });
});

// Approved organizers submit campaigns; an admin reviews them before they go live.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  const organizer = must(
    await db().from("dw_organizers").select("status").eq("pi_uid", session.uid).maybeSingle()
  ) as { status: string } | null;
  if (organizer?.status !== "approved") throw new HttpError(403, "organizer_not_approved");

  const body = await readJson<Record<string, unknown>>(request);
  const category = str(body.category, 20, "category")!;
  if (!(CATEGORIES as readonly string[]).includes(category)) throw new HttpError(400, "category_invalid");
  const goal = positiveAmount(body.goal, "goal");
  if (goal > 10_000_000) throw new HttpError(400, "goal_too_large");
  const deadline = str(body.deadline, 40, "deadline", true);
  if (deadline && Number.isNaN(Date.parse(deadline))) throw new HttpError(400, "deadline_invalid");
  const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0, 8).map((u, i) => httpsUrl(u, `gallery_${i}`)).filter(Boolean) : [];

  const row = must(
    await db()
      .from("dw_campaigns")
      .insert({
        organizer_uid: session.uid,
        title: str(body.title, 120, "title"),
        summary: str(body.summary, 280, "summary"),
        story: str(body.story, 8000, "story"),
        category,
        country: str(body.country, 60, "country"),
        goal,
        cover_url: httpsUrl(body.cover_url, "cover_url"),
        gallery,
        video_url: httpsUrl(body.video_url, "video_url"),
        urgent: body.urgent === true,
        deadline,
        status: "pending",
      })
      .select("id")
      .single()
  ) as { id: string };
  return json({ id: row.id }, 201);
});
