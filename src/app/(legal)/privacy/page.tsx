import { type Metadata } from "next";

import { CONTACT_EMAIL, LAST_UPDATED } from "../contact";

export const metadata: Metadata = {
  title: "Privacy Policy - BACulator",
  description: "What BACulator stores, why, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-neutral-400">Last updated {LAST_UPDATED}</p>

      <p>
        BACulator is a blood alcohol content (BAC) estimator. This page explains what
        information it stores, why, and how to have it deleted.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your Google account basics.</strong> When you sign in with Google we
          receive your name, email address and profile picture, plus the sign-in tokens
          Google issues. We use these only to sign you in and show your name and picture.
        </li>
        <li>
          <strong>Your body details.</strong> The weight and sex you enter, which the BAC
          estimate needs.
        </li>
        <li>
          <strong>Your drinks.</strong> Each drink you log: what you typed, the drink and
          size we matched it to, its standard drinks, and when you finished it, grouped
          into drinking sessions. We keep your 5 most recent sessions and delete older
          ones automatically.
        </li>
      </ul>

      <h2>How drink descriptions are understood</h2>
      <p>
        When you type a drink, we first match it against our own drink list. If that
        doesn&apos;t work, the text you typed is sent to an AI model run by Cloudflare
        (Workers AI) to work out the drink and its size. We send only the drink text,
        not your name, email or other details. We keep anonymous copies of these
        results, not linked to you, so the same phrase is faster next time.
      </p>

      <h2>Where it&apos;s stored</h2>
      <p>
        The app and its database run on Cloudflare (Workers and D1). Sign-in is handled
        by Google. Both act as our service providers and may process data outside
        Australia.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell, rent or share your information with anyone for marketing.</li>
        <li>We don&apos;t show ads or use advertising trackers.</li>
        <li>We don&apos;t use your data for anything other than running BACulator.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account and everything linked to it yourself, straight away,
        at <a href="/account/delete">baculator.com/account/delete</a>. If you can&apos;t
        sign in, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
        address you used and we&apos;ll delete it for you. You can also remove
        BACulator&apos;s access at any time from your Google account&apos;s security
        settings.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date at the top.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
