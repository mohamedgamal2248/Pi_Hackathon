import { connection } from "next/server";
import { hostIsTestnet } from "@/lib/server/network";

// Pi Developers domain verification: serves the app's validation key from the environment
// (PI_VALIDATION_KEY in Vercel), so the key is never committed to the repository.
export async function GET(request: Request) {
  await connection();
  const key = hostIsTestnet(request) ? process.env.PI_VALIDATION_KEY_TESTNET : process.env.PI_VALIDATION_KEY;
  if (!key) return new Response("not configured", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
