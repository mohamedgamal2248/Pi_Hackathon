export type ImpactUnit = { amount: number; label: string };

export type Campaign = {
  id: string;
  title: string;
  summary: string | null;
  story?: string;
  category: string;
  country: string;
  goal: number;
  raised: number;
  donors: number;
  released: number;
  cover_url: string | null;
  gallery?: string[];
  video_url?: string | null;
  urgent: boolean;
  zakat_eligible: boolean;
  deadline: string | null;
  status: string;
  created_at: string;
  impact_units: ImpactUnit[];
};

export type Update = {
  id: string;
  kind: "update" | "proof_of_spend" | "milestone";
  title: string;
  body: string;
  amount_spent: number | null;
  media: string[];
  created_at: string;
};

export type CampaignDetail = Campaign & {
  following: boolean;
  updates: Update[];
  recentDonors: { name: string | null; amount: number; message: string | null; at: string }[];
};

export type FeedItem = { name: string | null; amount: number; at: string; gift: string | null; campaignId: string | null; target: string };
export type Proof = Update & { campaign_id: string; campaign: string };

export const CATEGORY_KEYS = ["health", "food", "water", "orphans", "education", "debts", "emergency", "mosque", "other"] as const;

// 1,234.5 — Pi amounts with up to 2 decimals (more for tiny amounts).
export function fmt(n: number, max = 2) {
  const digits = Math.abs(n) > 0 && Math.abs(n) < 0.01 ? 4 : max;
  return Number(n.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}
export const pi = (n: number) => `${fmt(n)} π`;
export const usd = (n: number) => `$${n < 1 ? n.toFixed(3) : fmt(n)}`;

export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

export function youtubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export const lines = (s: string) =>
  s
    .split(/\s*\n\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

// Shareable links point at the app's pinet.com address (opens in Pi Browser), not the hosting URL.
export function shareUrl(path: string, ref?: string | null): string {
  const base = process.env.NEXT_PUBLIC_PI_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${base.replace(/\/$/, "")}${path}`;
  return ref ? `${url}${url.includes("?") ? "&" : "?"}ref=${ref}` : url;
}

export function sharePi(title: string, text: string, url: string) {
  if (typeof window === "undefined") return;
  if (window.Pi?.openShareDialog) window.Pi.openShareDialog(title, `${text}\n${url}`);
  else if (navigator.share) navigator.share({ title, text, url }).catch(() => undefined);
  else navigator.clipboard?.writeText(url).catch(() => undefined);
}
