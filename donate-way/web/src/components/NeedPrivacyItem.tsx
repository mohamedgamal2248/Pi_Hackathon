"use client";

import { useNeedEnabled } from "@/lib/client/need-types";

// Privacy-policy line about need-fund documents; shown only where verified-need funds are live.
export function NeedPrivacyItem() {
  const on = useNeedEnabled();
  if (!on) return null;
  return (
    <li>
          If you apply for a verified-need fund: the case type, amount, your description, and photos of your paper documents. The photos are kept in private storage, shown
          only to you and the review team through short-lived links, and erased when you delete your data (once the request is closed). We also store whether your
          wallet exists on the Pi blockchain, to confirm you are a verified Pioneer.
        </li>
  );
}
