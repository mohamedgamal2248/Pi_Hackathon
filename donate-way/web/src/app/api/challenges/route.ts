import { activeChallenge } from "@/lib/server/challenges";
import { handler, json } from "@/lib/server/http";

export const GET = handler(async () => json({ challenge: await activeChallenge() }));
