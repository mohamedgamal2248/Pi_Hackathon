import { randomBytes } from "node:crypto";
import { db, must } from "@/lib/server/db";
import { clientIp, handler, HttpError, isAdmin, json, rateLimit, readJson } from "@/lib/server/http";
import { PiApiError, verifyAccessToken } from "@/lib/server/pi";
import { createSession } from "@/lib/server/session";
import { WALLET_RE } from "@/lib/server/wallet";

const newCode = () =>
  Array.from(randomBytes(8))
    .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
    .join("");

export const POST = handler(async (request) => {
  rateLimit(`signin:${clientIp(request)}`, 20, 60_000);
  const body = await readJson<{ accessToken?: string; walletAddress?: string; ref?: string }>(request);
  const { accessToken } = body;
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4000) throw new HttpError(400, "token_required");

  // Who the user is comes only from Pi, never from the browser.
  let me;
  try {
    me = await verifyAccessToken(accessToken);
  } catch (err) {
    if (err instanceof PiApiError && err.status === 401) throw new HttpError(401, "pi_token_invalid");
    throw err;
  }
  const username = me.username ?? `pioneer-${me.uid.slice(0, 6)}`;
  // Wallet address: from Pi's /me when it returns it, else from the SDK's auth result. It is only used to
  // read public balances for the zakat calculator, never to send funds.
  const fromPi = (me as { wallet_address?: string }).wallet_address;
  const wallet = [fromPi, body.walletAddress].find((w) => typeof w === "string" && WALLET_RE.test(w)) ?? null;

  const existing = must(
    await db().from("dw_users").select("referral_code,wallet_address").eq("pi_uid", me.uid).maybeSingle()
  ) as { referral_code: string | null; wallet_address: string | null } | null;

  let referredBy: string | null = null;
  if (!existing && typeof body.ref === "string" && /^[a-z0-9]{6,12}$/.test(body.ref)) {
    const { data } = await db().from("dw_users").select("pi_uid").eq("referral_code", body.ref).maybeSingle();
    referredBy = data?.pi_uid ?? null;
  }

  must(
    await db()
      .from("dw_users")
      .upsert(
        {
          pi_uid: me.uid,
          username,
          last_seen_at: new Date().toISOString(),
          wallet_address: wallet ?? existing?.wallet_address ?? null,
          referral_code: existing?.referral_code ?? newCode(),
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
        { onConflict: "pi_uid" }
      )
  );

  return json({
    token: createSession(me.uid, username),
    user: { username, isAdmin: await isAdmin(me.uid), hasWallet: !!(wallet ?? existing?.wallet_address) },
  });
});
