// Every donation: 95% goes to the campaign (or fund), 5% to run the platform. Stated in the Terms.
export const PLATFORM_FEE_RATE = 0.05;

const round7 = (n: number) => Math.round(n * 1e7) / 1e7;

export function split(amount: number) {
  const platformFee = round7(amount * PLATFORM_FEE_RATE);
  return { amount: round7(amount), campaignShare: round7(amount - platformFee), platformFee };
}
