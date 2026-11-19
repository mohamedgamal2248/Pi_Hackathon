export const metadata = { title: "Privacy Policy · Sanad" };

export default function Privacy() {
  return (
    <article className="card space-y-4 p-6 text-sm leading-relaxed" dir="ltr">
      <h1 className="text-xl font-bold">Privacy Policy</h1>
      <p>Last updated: November 2026.</p>
      <p>
        Sanad is a donation app that runs in the Pi Browser. When you sign in with Pi, we receive your Pi username and an
        app-specific user ID from Pi Network. We do not receive your wallet passphrase, email, or phone number.
      </p>
      <h2 className="font-bold">What we store</h2>
      <ul className="list-disc space-y-1 ps-5">
        <li>Your Pi username and app-specific user ID.</li>
        <li>Your donations: amount, campaign, payment identifiers and blockchain transaction IDs, optional support message, and whether you chose to donate anonymously.</li>
        <li>Monthly giving pledges you create, campaigns you follow, and giving points.</li>
        <li>For organizers: the details and document links you submit for verification, and your campaigns, updates and receipts.</li>
      </ul>
      <h2 className="font-bold">How we use it</h2>
      <p>
        To process and verify donations with the Pi Platform API, show campaign progress and honor boards (anonymous donations are never shown with your
        name), send you Pi in-app notifications you allowed, and review organizers and campaigns.
      </p>
      <h2 className="font-bold">Sharing</h2>
      <p>
        We do not sell personal data. Donations are recorded on the Pi blockchain, which is public. Organizer documents are only visible to Sanad
        administrators.
      </p>
      <h2 className="font-bold">Your choices</h2>
      <p>You can donate anonymously, stop monthly pledges at any time, and ask us to delete your account data (blockchain records cannot be deleted).</p>
      <p>Pi, Pi Network and the Pi logo are trademarks of the Pi Community Company.</p>
    </article>
  );
}
