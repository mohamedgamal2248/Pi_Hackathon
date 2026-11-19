import "server-only";
import { createHmac } from "node:crypto";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  piApiKey: () => required("PI_API_KEY"),
  // Only needed for app-to-user payouts (tranches to organizers).
  piWalletSeed: () => required("PI_WALLET_PRIVATE_SEED"),
  // Defaults to a key derived from the service-role key, so one fewer secret to manage.
  sessionSecret: () =>
    process.env.SESSION_SECRET || createHmac("sha256", required("SUPABASE_SERVICE_ROLE_KEY")).update("dw-session-v1").digest("hex"),
  cronSecret: () => process.env.CRON_SECRET ?? "",
  adminUids: () =>
    (process.env.ADMIN_PI_UIDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
};
