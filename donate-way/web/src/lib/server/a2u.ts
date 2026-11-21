import "server-only";
import PiNetwork from "pi-backend";
import { HttpError } from "./http";
import { isTestnet } from "./network";

// App-to-user payouts, signed by the app wallet. Each network (Mainnet app / Testnet staging app) has its own
// API key and wallet seed, both kept only in server environment variables.
function client(): PiNetwork {
  const key = isTestnet() ? process.env.PI_API_KEY_TESTNET : process.env.PI_API_KEY;
  const seed = isTestnet() ? process.env.PI_WALLET_PRIVATE_SEED_TESTNET : process.env.PI_WALLET_PRIVATE_SEED;
  if (!key || !seed) throw new HttpError(503, "payout_wallet_not_configured");
  return new PiNetwork(key, seed);
}

export type A2UState = { paymentId?: string | null; txid?: string | null };

// Resumable: pass what is already stored (payment id / txid) and only the missing steps run.
// `onStep` lets the caller persist each id the moment it exists, so a crash never double-pays.
export async function sendToUser(
  args: { uid: string; amount: number; memo: string; metadata: Record<string, unknown> },
  state: A2UState,
  onStep: (s: A2UState) => Promise<void>
): Promise<{ paymentId: string; txid: string }> {
  const pi = client();
  let { paymentId, txid } = state;
  if (!paymentId) {
    paymentId = await pi.createPayment({ amount: args.amount, memo: args.memo.slice(0, 100), metadata: args.metadata, uid: args.uid });
    await onStep({ paymentId });
  }
  if (!txid) {
    txid = await pi.submitPayment(paymentId);
    await onStep({ paymentId, txid });
  }
  await pi.completePayment(paymentId, txid);
  return { paymentId, txid };
}
