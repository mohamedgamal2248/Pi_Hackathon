export type PiAuthResult = { accessToken: string; user: { uid: string; username: string } };

export type PiPaymentDTO = {
  identifier: string;
  amount: number;
  metadata: Record<string, unknown>;
  transaction: null | { txid: string };
};

export type PiCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPaymentDTO) => void;
};

export type PiSDK = {
  init: (opts: { version: string; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (scopes: string[], onIncompletePaymentFound: (p: PiPaymentDTO) => void) => Promise<PiAuthResult>;
  createPayment: (data: { amount: number; memo: string; metadata: Record<string, unknown> }, cb: PiCallbacks) => void;
  openShareDialog?: (title: string, message: string) => void;
  Ads?: {
    showAd: (type: "interstitial" | "rewarded") => Promise<{ result: string; adId?: string }>;
    isAdReady: (type: "interstitial" | "rewarded") => Promise<{ ready: boolean }>;
  };
};

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}
