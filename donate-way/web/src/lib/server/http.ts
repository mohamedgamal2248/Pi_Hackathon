import "server-only";
import { connection, NextResponse } from "next/server";
import { readSession, type Session } from "./session";
import { db } from "./db";
import { env } from "./env";
import { isTestnet, withNetwork } from "./network";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function requireSession(request: Request): Session {
  const session = readSession(request);
  if (!session) throw new HttpError(401, "sign_in_required");
  return session;
}

export async function isAdmin(uid: string): Promise<boolean> {
  if (isTestnet()) return true; // Staging holds Test-Pi and test data only: every tester can open /admin
  if (env.adminUids().includes(uid)) return true;
  const { data } = await db().from("dw_users").select("is_admin").eq("pi_uid", uid).maybeSingle();
  return !!data?.is_admin;
}

export async function requireAdmin(request: Request): Promise<Session> {
  const session = requireSession(request);
  if (!(await isAdmin(session.uid))) throw new HttpError(403, "admin_only");
  return session;
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

// Wraps a route handler: turns thrown HttpErrors into JSON responses and hides internal errors.
export function handler<C>(fn: (request: Request, ctx: C) => Promise<Response>) {
  return async (request: Request, ctx: C) => {
    try {
      await connection(); // always run at request time, never prerendered at build
      return await withNetwork(request, () => fn(request, ctx));
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "server_error" }, 500);
    }
  };
}

export function str(value: unknown, max: number, field: string, optional = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw new HttpError(400, `${field}_required`);
  }
  if (typeof value !== "string") throw new HttpError(400, `${field}_invalid`);
  const trimmed = value.trim();
  if (!trimmed && !optional) throw new HttpError(400, `${field}_required`);
  if (trimmed.length > max) throw new HttpError(400, `${field}_too_long`);
  return trimmed || null;
}

export function positiveAmount(value: unknown, field = "amount"): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) throw new HttpError(400, `${field}_invalid`);
  // Pi has 7 decimals
  return Math.round(n * 1e7) / 1e7;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new HttpError(400, `${field}_invalid`);
  return value;
}

export function httpsUrl(value: unknown, field: string): string | null {
  const s = str(value, 600, field, true);
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new HttpError(400, `${field}_invalid`);
  }
}

// Small per-instance rate limiter (best effort on serverless): max `limit` hits per `windowMs` per key.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) throw new HttpError(429, "too_many_requests");
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
