export const metadata = { title: "Terms of Service · Sanad" };

export default function Terms() {
  return (
    <article className="card space-y-4 p-6 text-sm leading-relaxed" dir="ltr">
      <h1 className="text-xl font-bold">Terms of Service</h1>
      <p>Last updated: November 2026.</p>
      <h2 className="font-bold">Donations</h2>
      <p>
        Donations are made in Pi through the Pi Wallet and are final once confirmed on the blockchain. Sanad holds campaign funds in the app wallet and
        releases them to the organizer in stages. A new release requires a published proof of spending for the previous one.
      </p>
      <h2 className="font-bold">Organizers</h2>
      <p>
        Organizers must be verified before creating campaigns and must use funds only for the stated purpose. Sanad may pause or close a campaign and
        stop releases if information is false or proof of spending is missing. Remaining funds of a closed campaign go to the general fund.
      </p>
      <h2 className="font-bold">Monthly giving</h2>
      <p>Monthly pledges are reminders: every payment is confirmed by you in the Pi Wallet. You can stop a pledge at any time.</p>
      <h2 className="font-bold">Giving points</h2>
      <p>Giving points have no cash value. If a Sanad token is launched, points may be converted under rules published at that time.</p>
      <h2 className="font-bold">Liability</h2>
      <p>
        Sanad is a community app and is not developed by the Pi Core Team. We verify organizers and require proof of spending, but cannot guarantee the
        outcome of any campaign.
      </p>
      <p>Pi, Pi Network and the Pi logo are trademarks of the Pi Community Company.</p>
    </article>
  );
}
