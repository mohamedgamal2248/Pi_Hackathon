import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// A small signed token instead of a cookie: Pi Browser / Sandbox load the app inside a frame,
// where third-party cookies are often dropped. The client sends it as `Authorization: Bearer <token>`.
export type Session = { uid: string; username: string; exp: number };

const TTL_SECONDS = 60 * 60 * 24 * 7;

function sign(payload: string) {
  return createHmac("sha256", env.sessionSecret()).update(payload).digest("base64url");
}

export function createSession(uid: string, username: string): string {
  const session: Session = { uid, username, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(request: Request): Session | null {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}
