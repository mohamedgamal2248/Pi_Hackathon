import "server-only";
import { CATEGORIES } from "./campaigns";
import { HttpError, httpsUrl, positiveAmount, str } from "./http";

const STATUSES = ["draft", "active", "funded", "completed", "paused"];

// Validates the admin's campaign form. `partial` for edits (only the fields sent are checked).
export function campaignInput(body: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => !partial || k in body;

  if (has("title")) out.title = str(body.title, 120, "title");
  if (has("summary")) out.summary = str(body.summary, 280, "summary", true);
  if (has("story")) out.story = str(body.story, 8000, "story");
  if (has("category")) {
    const c = str(body.category, 20, "category")!;
    if (!(CATEGORIES as readonly string[]).includes(c)) throw new HttpError(400, "category_invalid");
    out.category = c;
  }
  if (has("country")) out.country = str(body.country, 60, "country", true) ?? "مصر";
  if (has("goal")) {
    const goal = positiveAmount(body.goal, "goal");
    if (goal > 10_000_000) throw new HttpError(400, "goal_too_large");
    out.goal = goal;
  }
  if (has("cover_url")) out.cover_url = httpsUrl(body.cover_url, "cover_url");
  if (has("cover_path")) out.cover_path = str(body.cover_path, 200, "cover_path", true);
  if (has("gallery")) out.gallery = Array.isArray(body.gallery) ? body.gallery.slice(0, 8).map((u, i) => httpsUrl(u, `gallery_${i}`)).filter(Boolean) : [];
  if (has("video_url")) out.video_url = httpsUrl(body.video_url, "video_url");
  if (has("urgent")) out.urgent = body.urgent === true;
  if (has("zakat_eligible")) out.zakat_eligible = body.zakat_eligible === true;
  if (has("deadline")) {
    const d = str(body.deadline, 40, "deadline", true);
    if (d && Number.isNaN(Date.parse(d))) throw new HttpError(400, "deadline_invalid");
    out.deadline = d;
  }
  if (has("impact_units")) {
    const units = Array.isArray(body.impact_units) ? body.impact_units.slice(0, 6) : [];
    out.impact_units = units
      .map((u) => {
        const unit = u as { amount?: unknown; label?: unknown };
        const label = typeof unit.label === "string" ? unit.label.trim().slice(0, 40) : "";
        const amount = Number(unit.amount);
        return label && Number.isFinite(amount) && amount > 0 ? { amount: Math.round(amount * 100) / 100, label } : null;
      })
      .filter(Boolean);
  }
  if (has("status")) {
    const s = str(body.status, 20, "status", partial) ?? "active";
    if (!STATUSES.includes(s)) throw new HttpError(400, "status_invalid");
    out.status = s;
  }
  return out;
}
