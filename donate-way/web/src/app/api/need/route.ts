import { handler, json, rateLimit, readJson, requireSession } from "@/lib/server/http";
import { CASE_TYPES, createDraft, maxAmount, myRequests, NEED_FEE, needEnabled, STAGE1_SHARE, WINDOWS } from "@/lib/server/need";
import { readSession } from "@/lib/server/session";
import { isWalletVerified } from "@/lib/server/verify";

const config = () => ({
  fee: NEED_FEE,
  windows: WINDOWS,
  stage1Pct: Math.round(STAGE1_SHARE * 100),
  caseTypes: CASE_TYPES.map((type) => ({ type, max: maxAmount(type) })),
});

// My requests + the form rules. Signed-out visitors only get the rules.
export const GET = handler(async (request) => {
  const session = readSession(request);
  const enabled = needEnabled();
  if (!session) return json({ enabled, config: config(), requests: [], verified: false });
  return json({ enabled, config: config(), requests: await myRequests(session.uid), verified: await isWalletVerified(session.uid) });
});

export const POST = handler(async (request) => {
  const session = requireSession(request);
  rateLimit(`need:${session.uid}`, 10, 60_000);
  return json(await createDraft(session.uid, await readJson(request)), 201);
});
