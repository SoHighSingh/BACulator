import { type Metadata } from "next";

import { CONTACT_EMAIL, LAST_UPDATED } from "../contact";

export const metadata: Metadata = {
  title: "Terms of Use - BACulator",
  description: "The terms for using BACulator.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-sm text-neutral-400">Last updated {LAST_UPDATED}</p>

      <h2>Estimates only, for entertainment</h2>
      <p>
        BACulator gives a rough estimate of blood alcohol content based on a standard
        formula, the drinks you log and the details you enter. It is for entertainment
        and general education only. It is not a breathalyser, not a medical device, and
        not medical advice.
      </p>
      <p>
        Real BAC varies a lot with food, health, medication, genetics, tolerance and how
        accurately drinks are logged. Your actual BAC may be much higher than BACulator
        shows.
      </p>

      <h2>Never use it to decide whether to drive</h2>
      <p>
        <strong>
          Do not use BACulator to decide whether you are fit to drive, ride, operate
          machinery, or do anything else where alcohol puts you or others at risk.
        </strong>{" "}
        If you&apos;ve been drinking, don&apos;t drive: use a designated driver, public
        transport, a taxi or a rideshare. In an emergency, call 000 (911 in the US) or your
        local emergency number.
      </p>

      <h2>Using BACulator</h2>
      <ul>
        <li>
          You must be of legal drinking age where you live, and at least 18 (21 in the US).
        </li>
        <li>Don&apos;t misuse the service, try to break it, or access other people&apos;s data.</li>
        <li>We may change, suspend or stop BACulator at any time.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        BACulator is provided &quot;as is&quot;, without any guarantee that it is accurate,
        available or error-free. To the extent the law allows, we are not liable for any
        loss or harm arising from using it or relying on its estimates. Nothing here
        limits rights you have under the Australian Consumer Law that can&apos;t be
        excluded.
      </p>

      <h2>Your data</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> for what we store and how to have
        it deleted.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
