import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { isTestnet } from "./network";

let client: SupabaseClient | null = null;

function raw(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// On the Testnet staging domain every table name dw_* becomes dwt_* (same schema, separate data).
// Rewrites the table in from() and table names inside select/filter column strings
// (e.g. "dw_campaigns(title)", "dw_donations.status"). Values are never rewritten.
const rename = (s: string) => s.replace(/\bdw_/g, "dwt_");
const VALUE_METHODS = new Set(["insert", "upsert", "update"]);

function wrapBuilder<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function" || prop === "then" || prop === "catch" || prop === "finally") {
        return typeof value === "function" ? value.bind(obj) : value;
      }
      return (...args: unknown[]) => {
        if (!VALUE_METHODS.has(String(prop)) && typeof args[0] === "string") args[0] = rename(args[0]);
        const out = value.apply(obj, args);
        return out && typeof out === "object" && "then" in out ? wrapBuilder(out) : out;
      };
    },
  });
}

// Service-role client. All dw_* tables have RLS with no policies, so only this server can touch them.
export function db(): SupabaseClient {
  const c = raw();
  if (!isTestnet()) return c;
  return new Proxy(c, {
    get(obj, prop, receiver) {
      if (prop === "from") return (table: string) => wrapBuilder(obj.from(rename(table)));
      const v = Reflect.get(obj, prop, receiver);
      return typeof v === "function" ? v.bind(obj) : v;
    },
  });
}

export function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
