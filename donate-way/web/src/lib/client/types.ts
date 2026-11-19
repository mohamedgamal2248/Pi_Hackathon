export type Campaign = {
  id: string;
  title: string;
  summary: string;
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
  deadline: string | null;
  status: string;
  created_at: string;
  organizer: { username: string; name: string; org: string | null } | null;
};

export type CampaignDetail = Campaign & {
  isOwner: boolean;
  following: boolean;
  updates: {
    id: string;
    kind: "update" | "proof_of_spend" | "milestone";
    title: string;
    body: string;
    amount_spent: number | null;
    media: string[];
    created_at: string;
  }[];
  tranches: { id: string; amount: number; status: string; txid: string | null; note: string | null; created_at: string; paid_at: string | null }[];
  recentDonors: { name: string | null; amount: number; message: string | null; at: string }[];
};

export const CATEGORY_KEYS = ["health", "education", "food", "water", "emergency", "orphans", "mosque", "other"] as const;

export const pi = (n: number) => `${Number(n.toFixed(2)).toLocaleString("en-US")} π`;

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
export function shareUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_PI_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}${path}`;
}
