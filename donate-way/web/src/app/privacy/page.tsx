export const metadata = { title: "Privacy Policy · Sanad" };

// English privacy policy (also the page referenced by the Pi Mainnet listing). Kept in sync with what the app actually stores.
export default function Privacy() {
  return (
    <article className="card space-y-4 p-6 text-sm leading-relaxed" dir="ltr" lang="en">
      <h1 className="text-xl font-bold">Privacy Policy</h1>
      <p>Last updated: November 2026.</p>
      <p>
        Sanad is a donation and zakat app that runs inside Pi Browser. We collect as little as we can. We sign you in only with Pi, and we take payments
        only in Pi.
      </p>

      <h2 className="font-bold">What we receive and store</h2>
      <ul className="list-disc space-y-1 ps-5">
        <li>Your Pi username and the app-specific user ID that Pi gives us when you sign in.</li>
        <li>
          Your public Pi wallet address, only if you allow the wallet permission. We use it to read your public balance so we can calculate zakat. We
          never move funds from it.
        </li>
        <li>
          Your donations: amount, campaign, Pi payment identifier, blockchain transaction ID, an optional message, gift or memorial details you type
          (the name and note), and whether you chose to give anonymously.
        </li>
        <li>Campaigns you follow, campaigns you report, fundraising pages you create, giving points and streaks, and the date you started your zakat year.</li>
        <li>Your invite code and who invited you, to credit ambassadors.</li>
        <li>On your device only: your language, last gift amount and sign-in consent. We do not use cookies or advertising trackers. We count visits with cookie-free Vercel Web Analytics.</li>
      </ul>
      <p>We do not receive your wallet passphrase, email address, phone number, contacts or location.</p>

      <h2 className="font-bold">How we use it</h2>
      <p>
        To process and verify payments with the Pi Platform API, show campaign progress, receipts and leaderboards (anonymous gifts are never shown with
        your name, and leaderboard names are partly hidden), calculate zakat, send Pi in-app notifications you allowed (for example a campaign update or a
        reminder), and review reported campaigns.
      </p>

      <h2 className="font-bold">Third parties</h2>
      <ul className="list-disc space-y-1 ps-5">
        <li>Pi Network: sign-in, payments and notifications.</li>
        <li>Pi blockchain (public): payments and wallet balances are public by design.</li>
        <li>Our database and hosting providers, who store data for us under our instructions.</li>
        <li>Vercel Web Analytics, a cookie-free service that counts page views and visitors without identifying you.</li>
        <li>OKX public market data, to read Pi and gold prices. No personal data is sent.</li>
      </ul>
      <p>We do not sell personal data and we do not share it for advertising.</p>

      <h2 className="font-bold">Your choices</h2>
      <p>
        You can give anonymously, stop following campaigns, and delete your data at any time from <b>Profile → Delete my data</b>. This removes your
        username, wallet address, invite link, follows and fundraising pages, and makes your past gifts anonymous. Blockchain records cannot be deleted
        and campaign totals keep counting past gifts.
      </p>

      <h2 className="font-bold">Children</h2>
      <p>Sanad is not directed to children under 13.</p>

      <h2 className="font-bold">Changes</h2>
      <p>If this policy changes we will update the date above.</p>
      <p className="text-xs text-muted">Pi, Pi Network and the Pi logo are trademarks of the Pi Community Company.</p>
    </article>
  );
}
