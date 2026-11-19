import { db } from "@/lib/server/db";
import { handler, json, requireAdmin } from "@/lib/server/http";

export const GET = handler(async (request) => {
  await requireAdmin(request);
  const [organizers, campaigns, tranches] = await Promise.all([
    db().from("dw_organizers").select("id,pi_uid,full_name,org_name,country,phone,bio,documents,status,created_at,dw_users(username)").eq("status", "pending").order("created_at"),
    db().from("dw_campaigns").select("id,title,summary,category,country,goal,cover_url,status,created_at").eq("status", "pending").order("created_at"),
    db()
      .from("dw_tranches")
      .select("id,amount,status,note,created_at,campaign_id,proof_update_id,dw_campaigns(title)")
      .in("status", ["requested", "approved"])
      .order("created_at"),
  ]);
  return json({ organizers: organizers.data ?? [], campaigns: campaigns.data ?? [], tranches: tranches.data ?? [] });
});
