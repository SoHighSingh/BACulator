import { type Metadata } from "next";

import { CONTACT_EMAIL, LAST_UPDATED, OAIC_COMPLAINTS_URL } from "../contact";

// DRAFT for the owner's review (17 Oct 2026). Not legal advice; open questions are listed in the PR.

export const metadata: Metadata = {
  title: "Privacy Policy - BACulator",
  description: "What BACulator stores, why, where it goes, and how to see, download or delete it.",
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-neutral-400">Last updated {LAST_UPDATED}</p>

      <h2>The short version</h2>
      <ul>
        <li>We store your drinks, weight and sex so we can estimate your blood alcohol.</li>
        <li>We treat this as health information. We ask before we collect it.</li>
        <li>We never sell it, share it for ads, or use it for anything else.</li>
        <li>It is stored with Cloudflare, mostly in the US. Sign-in is through Google.</li>
        <li>
          You can download it or delete it yourself, any time, at{" "}
          <a href="/account/delete">baculator.com/account/delete</a>.
        </li>
      </ul>

      <h2>Who we are</h2>
      <p>
        BACulator is a free blood alcohol estimator run by one person, its developer. In this
        policy &quot;we&quot; means them. Contact: {mail}.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li>
          <strong>Your Google account basics.</strong> Your name, email address and profile
          picture, and the sign-in tokens Google gives us. We use these only to sign you in and
          show who is signed in.
        </li>
        <li>
          <strong>Your weight and sex.</strong> The estimate can&apos;t work without them.
        </li>
        <li>
          <strong>Your drinks.</strong> Each drink you add: what you typed, the drink, size and
          strength we matched, its standard drinks, and when you finished it. Drinks are grouped
          into sessions.
        </li>
        <li>
          <strong>Your consent.</strong> When you confirmed you are of legal drinking age, and
          which version of our terms you agreed to.
        </li>
        <li>
          <strong>Basic technical data.</strong> Like every website, Cloudflare (our host) sees
          your IP address and browser details when you use BACulator, to deliver the page and
          block attacks. We don&apos;t use this to track you.
        </li>
      </ul>
      <p>We don&apos;t ask for your location, contacts, or anything else on your phone.</p>

      <h2>This is health information</h2>
      <p>
        What you drink, together with your weight and sex, says something about your health.
        Under Australia&apos;s Privacy Act 1988 that is &quot;sensitive information&quot;, and
        under some US state laws it is &quot;consumer health data&quot;. So we:
      </p>
      <ul>
        <li>
          ask for your consent before you sign in, and again if what we store changes
          (Australian Privacy Principle 3);
        </li>
        <li>collect only what the estimate needs;</li>
        <li>use it only to run BACulator for you.</li>
      </ul>
      <p>
        You can take back your consent at any time by deleting your account. You don&apos;t have
        to give us this information, but without it BACulator can&apos;t estimate anything.
      </p>

      <h2>How typed drinks are understood</h2>
      <p>
        When you type a drink, we first look it up in our own drink list. If that doesn&apos;t
        work, the text you typed (only that text, never your name, email or other details) is
        sent to an AI model that Cloudflare runs for us (Workers AI). We keep the result, with
        the text but not linked to you, so the same words are quicker next time. Please
        don&apos;t type anything personal into the drink box.
      </p>

      <h2>Cookies and storage on your device</h2>
      <ul>
        <li>
          <strong>Sign-in cookie.</strong> When you sign in we set one cookie that keeps you
          signed in (it lasts up to 30 days, or until you sign out). A few short-lived cookies
          protect the sign-in step itself. These are needed for the app to work.
        </li>
        <li>
          <strong>Your device settings.</strong> Your region choice (for example US units) is
          kept in your browser, not on our servers. Your answer on the &quot;Before you
          start&quot; step is kept in your browser for a moment while Google signs you in.
        </li>
        <li>No advertising, analytics or tracking cookies.</li>
      </ul>

      <h2>Who else handles it</h2>
      <ul>
        <li>
          <strong>Cloudflare, Inc.</strong> (US) runs the app, the database (Cloudflare D1) and
          the AI drink reader.
        </li>
        <li>
          <strong>Google LLC</strong> (US) handles sign-in.
        </li>
      </ul>
      <p>
        They act for us as service providers. We don&apos;t sell or rent your information, and
        we don&apos;t share it with advertisers, insurers, employers or data brokers. We would
        only hand it to anyone else if the law forces us to, and we would tell you if we legally
        can.
      </p>

      <h2>Sending it overseas</h2>
      <p>
        Your information is stored and processed outside Australia: mainly in the United States,
        and in other countries where Cloudflare and Google run data centres. Before sending it,
        we take reasonable steps to make sure these providers protect it in line with the
        Australian Privacy Principles (Australian Privacy Principle 8), by using providers bound
        by data protection terms. Laws in those countries may differ from Australia&apos;s.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Everything travels over encrypted connections (HTTPS). Only the developer can reach the
        database, and only to run or fix BACulator. You can see only your own drinks. We delete
        information we no longer need (Australian Privacy Principle 11). No system is perfectly
        safe. If a data breach is likely to cause you serious harm, we will tell you and the
        regulator.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Drinks:</strong> your 5 most recent sessions. Older sessions and their drinks
          are deleted automatically when you start a new one. The estimate itself only looks at
          the last 48 hours.
        </li>
        <li>
          <strong>Recent drinks</strong> for one-tap adding are picked from those saved drinks,
          not stored separately.
        </li>
        <li>
          <strong>Your details, consent record and sign-in:</strong> until you delete your
          account.
        </li>
        <li>
          <strong>AI drink results</strong> (typed text, not linked to you): kept so they can be
          reused. They don&apos;t say who typed them.
        </li>
      </ul>

      <h2>See, download, fix or delete your information</h2>
      <ul>
        <li>
          <strong>Download:</strong> get a copy of your details and every saved drink at{" "}
          <a href="/account/delete">baculator.com/account/delete</a> (Australian Privacy
          Principle 12).
        </li>
        <li>
          <strong>Fix:</strong> change your weight and sex in your details, and edit or remove
          any drink on the night screen (Australian Privacy Principle 13). Your name, email and
          picture come from Google, so change them there.
        </li>
        <li>
          <strong>Delete:</strong> delete your account and everything linked to it, straight
          away, at <a href="/account/delete">baculator.com/account/delete</a>. You can also
          remove BACulator&apos;s access in your Google account&apos;s security settings.
        </li>
        <li>
          Can&apos;t sign in? Email {mail} from the address you used and we&apos;ll do it for
          you, free, within 30 days.
        </li>
      </ul>

      <h2>Complaints</h2>
      <p>
        If you think we&apos;ve mishandled your information, email {mail}. We&apos;ll reply
        within 30 days. If you&apos;re not happy with our answer, you can complain to the Office
        of the Australian Information Commissioner (OAIC) at{" "}
        <a href={OAIC_COMPLAINTS_URL}>oaic.gov.au</a> or on 1300 363 992.
      </p>

      <h2 id="consumer-health">If you live in the US: consumer health data</h2>
      <p>
        Some US states, including Washington (My Health My Data Act) and Nevada (SB 370), have
        laws about &quot;consumer health data&quot;. Your drinks, weight and sex may count. For
        people in those states, and anyone in the US:
      </p>
      <ul>
        <li>
          <strong>What we collect and why:</strong> the information listed above, only to give
          you the estimate you ask for.
        </li>
        <li>
          <strong>Where it comes from:</strong> you, and Google when you sign in.
        </li>
        <li>
          <strong>Who we share it with:</strong> only Cloudflare and Google, as our service
          providers. We don&apos;t sell it, and we don&apos;t use your location to target you.
        </li>
        <li>
          <strong>Your rights:</strong> to know whether we hold your consumer health data and
          see it, to get a list of who we&apos;ve shared it with, to delete it, and to take back
          your consent. Use the download and delete tools above, or email {mail}. We&apos;ll
          answer within 45 days.
        </li>
        <li>
          <strong>Appeals:</strong> if we turn down a request, reply to our answer with
          &quot;Appeal&quot; and we&apos;ll look at it again within 45 days. If you still
          disagree, you can contact your state&apos;s Attorney General (in Washington, at
          atg.wa.gov).
        </li>
      </ul>
      <p>Your state may give you other rights too. Email us and we&apos;ll help.</p>

      <h2>Age</h2>
      <p>
        BACulator is only for people of legal drinking age: 18 or older, or 21 or older in the
        US. If we learn that someone younger has an account, we&apos;ll delete it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date at the top. If we change
        what we collect or how we use it, we&apos;ll ask you to agree again in the app.
      </p>

      <h2>Contact</h2>
      <p>Questions or requests: {mail}</p>
    </>
  );
}
