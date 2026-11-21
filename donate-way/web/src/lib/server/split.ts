// Every donation: 95% goes to the campaign (or fund), 5% to run the platform. Stated in the Terms.
export const PLATFORM_FEE_RATE = 0.05;

const round7 = (n: number) => Math.round(n * 1e7) / 1e7;

// Verified-need funds keep no donation fee: the 1 Pi application fee is what the platform earns there.
export const NEED_PLATFORM_FEE_RATE = 0;

export function split(amount: number, rate = PLATFORM_FEE_RATE) {
  const platformFee = round7(amount * rate);
  return { amount: round7(amount), campaignShare: round7(amount - platformFee), platformFee };
}
