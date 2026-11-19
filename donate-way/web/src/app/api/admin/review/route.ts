import { db, must } from "@/lib/server/db";
import { handler, HttpError, json, readJson, requireAdmin, str, uuid } from "@/lib/server/http";
import { notify } from "@/lib/server/pi";
import { payTranche } from "@/lib/server/payouts";

type Body = { type: "organizer" | "campaign" | "tranche"; id: string; action: string; note?: string };

export const POST = handler(async (request) => {
  await requireAdmin(request);
  const body = await readJson<Body>(request);
  const id = uuid(body.id, "id");
  const note = str(body.note, 500, "note", true);
  const now = new Date().toISOString();

  if (body.type === "organizer") {
    if (!["approve", "reject"].includes(body.action)) throw new HttpError(400, "action_invalid");
    const status = body.action === "approve" ? "approved" : "rejected";
    const row = must(
      await db().from("dw_organizers").update({ status, review_note: note, reviewed_at: now }).eq("id", id).select("pi_uid").single()
    ) as { pi_uid: string };
    await notify([
      {
        user_uid: row.pi_uid,
        title: status === "approved" ? "✅ تم توثيقك كمنظّم" : "طلب التوثيق",
        body: status === "approved" ? "تقدر دلوقتي تنشئ حملتك الأولى." : note ?? "تم رفض الطلب، راجع البيانات وحاول تاني.",
        subroute: "/start",
      },
    ]);
    return json({ ok: true });
  }

  if (body.type === "campaign") {
    const map: Record<string, string> = { approve: "active", reject: "rejected", pause: "paused", complete: "completed" };
    const status = map[body.action];
    if (!status) throw new HttpError(400, "action_invalid");
    const row = must(
      await db()
        .from("dw_campaigns")
        .update({ status, ...(status === "active" ? { approved_at: now } : {}) })
        .eq("id", id)
        .select("organizer_uid,title")
        .single()
    ) as { organizer_uid: string; title: string };
    await notify([{ user_uid: row.organizer_uid, title: "حالة حملتك", body: `${row.title}: ${status}`, subroute: `/campaigns/${id}` }]);
    return json({ ok: true });
  }

  if (body.type === "tranche") {
    if (body.action === "reject") {
      await db().from("dw_tranches").update({ status: "rejected", note }).eq("id", id).eq("status", "requested");
      return json({ ok: true });
    }
    if (body.action === "pay") return json(await payTranche(id));
    throw new HttpError(400, "action_invalid");
  }

  throw new HttpError(400, "type_invalid");
});
