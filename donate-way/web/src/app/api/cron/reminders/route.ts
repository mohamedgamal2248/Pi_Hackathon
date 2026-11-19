import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, HttpError, json } from "@/lib/server/http";
import { notify } from "@/lib/server/pi";

// Daily (vercel.json cron): remind donors whose monthly pledge is due.
export const GET = handler(async (request) => {
  const secret = env.cronSecret();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "unauthorized");

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db()
    .from("dw_recurring")
    .select("id,pi_uid,amount,campaign_id,dw_campaigns(title)")
    .eq("active", true)
    .lte("next_due", today)
    .limit(5000);
  const rows = (data ?? []) as unknown as { id: string; pi_uid: string; amount: number; campaign_id: string | null; dw_campaigns: { title: string } | null }[];

  await notify(
    rows.map((r) => ({
      user_uid: r.pi_uid,
      title: "🤲 موعد صدقتك الشهرية",
      body: `${Number(r.amount)} π ${r.dw_campaigns ? `لحملة ${r.dw_campaigns.title}` : "للصندوق العام"}. اضغط للتأكيد بخطوة واحدة.`,
      subroute: `/me?pay=${r.id}`,
    }))
  );
  return json({ reminded: rows.length });
});
