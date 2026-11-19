import { connection } from "next/server";

// Pi Developers domain verification: serves the app's validation key from the environment
// (PI_VALIDATION_KEY in Vercel), so the key is never committed to the repository.
export async function GET() {
  await connection();
  const key = process.env.PI_VALIDATION_KEY;
  if (!key) return new Response("not configured", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
