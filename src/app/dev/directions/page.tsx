import Link from "next/link";

const DIRECTIONS = [
  { id: "clinical", name: "Result", line: "Clinical calm: the estimate set like a lab result, with its interval and its method." },
  { id: "dial", name: "Night dial", line: "Chronograph finish: the night drawn on a watch bezel, back to zero read off the dial." },
  { id: "forecast", name: "Forecast", line: "Data journalism: an annotated fan chart that widens honestly into the hours ahead." },
  { id: "native", name: "Health card", line: "Native-premium: grouped cards and range capsules, built to map onto the Swift port." },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-ink">
      <h1 className="text-3xl font-bold">Design directions</h1>
      <p className="mt-2 text-lg text-ink-2">Same sample night in each. Dev only.</p>
      <ul className="mt-8 flex flex-col gap-4">
        {DIRECTIONS.map((d) => (
          <li key={d.id} className="rounded-2xl bg-surface p-5">
            <p className="text-xl font-bold">{d.name}</p>
            <p className="mt-1 text-lg text-ink-2">{d.line}</p>
            <p className="mt-3 flex gap-6 text-lg font-semibold">
              <Link className="underline underline-offset-4" href={`/dev/directions/${d.id}`}>
                Night screen
              </Link>
              <Link className="underline underline-offset-4" href={`/dev/directions/${d.id}/hero`}>
                Landing hero
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
