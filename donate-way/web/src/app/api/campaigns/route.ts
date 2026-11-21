import { listCampaigns } from "@/lib/server/campaigns";
import { handler, json } from "@/lib/server/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.split(",").filter((x) => UUID.test(x)).slice(0, 20);
  const campaigns = await listCampaigns({
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    zakat: url.searchParams.get("zakat") === "1",
    kind: url.searchParams.get("kind") ?? undefined,
    ids: ids?.length ? ids : undefined,
  });
  return json({ campaigns });
});
