import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// One deployment serves two Pi apps:
//   production domain  -> "Sanad" (Mainnet), tables dw_*
//   staging domain     -> "Sanad Staging" (Testnet), tables dwt_*, its own Pi API key
// The request's host decides; route handlers run inside withNetwork() (see http.ts handler()).
const STAGING_HOSTS = (process.env.STAGING_HOSTS ?? "sanad-pi-staging.vercel.app")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

type Ctx = { testnet: boolean };
const store = new AsyncLocalStorage<Ctx>();

export function hostIsTestnet(request: Request) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  return STAGING_HOSTS.includes(host);
}

export function withNetwork<T>(request: Request, fn: () => Promise<T>): Promise<T> {
  return store.run({ testnet: hostIsTestnet(request) }, fn);
}

export const isTestnet = () => store.getStore()?.testnet ?? false;
