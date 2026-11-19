import { db, must } from "@/lib/server/db";
import { handler, HttpError, isAdmin, json, readJson } from "@/lib/server/http";
import { PiApiError, verifyAccessToken } from "@/lib/server/pi";
import { createSession } from "@/lib/server/session";

export const POST = handler(async (request) => {
  const { accessToken } = await readJson<{ accessToken?: string }>(request);
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4000) throw new HttpError(400, "token_required");

  let me;
  try {
    me = await verifyAccessToken(accessToken);
  } catch (err) {
    if (err instanceof PiApiError && err.status === 401) throw new HttpError(401, "pi_token_invalid");
    throw err;
  }
  const username = me.username ?? `pioneer-${me.uid.slice(0, 6)}`;

  must(
    await db()
      .from("dw_users")
      .upsert({ pi_uid: me.uid, username, last_seen_at: new Date().toISOString() }, { onConflict: "pi_uid" })
  );
  const organizer = must(
    await db().from("dw_organizers").select("status").eq("pi_uid", me.uid).maybeSingle()
  ) as { status: string } | null;

  return json({
    token: createSession(me.uid, username),
    user: { username, isAdmin: await isAdmin(me.uid), organizerStatus: organizer?.status ?? null },
  });
});
