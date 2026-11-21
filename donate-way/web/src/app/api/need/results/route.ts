import { handler, json } from "@/lib/server/http";
import { needResults } from "@/lib/server/need-extra";

// Public: every verified-need fund with what was collected and paid out.
export const GET = handler(async () => json(await needResults()));
