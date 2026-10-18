import { House, UserRound } from "lucide-react";

import { OPTIONS, type MarkState } from "./marks";
import { FaviconStrip } from "./Raster";

/* Local copies of the night screen's field (.glass-field / .is-alert in globals.css), positioned
   inside a strip instead of fixed to the viewport, plus the fake browser tab bars. */
const STYLES = `
.lg-strip{position:relative;width:375px;height:150px;overflow:hidden;background:#09090b;border-radius:14px;border:1px solid #27272a}
.lg-field{position:absolute;inset:0;pointer-events:none;background:
  radial-gradient(60% 45% at 50% 12%, rgb(70 120 255 / 0.22), transparent 70%),
  radial-gradient(40% 35% at 85% 0%, rgb(124 180 255 / 0.12), transparent 70%)}
.lg-field.is-alert{background:
  radial-gradient(70% 50% at 50% 14%, rgb(255 70 50 / 0.3), transparent 72%),
  radial-gradient(60% 45% at 50% 110%, rgb(255 70 50 / 0.14), transparent 70%),
  linear-gradient(rgb(60 8 4 / 0.35), rgb(60 8 4 / 0.35)),
  radial-gradient(60% 45% at 50% 12%, rgb(70 120 255 / 0.22), transparent 70%)}
.lg-tabbar{display:flex;align-items:center;gap:10px;height:44px;padding:6px 10px 0;border-radius:10px}
.lg-tabbar-light{background:#dfe3e8;color:#1f1f1f}
.lg-tabbar-light .lg-tab{background:#fff}
.lg-tabbar-dark{background:#202124;color:#e8eaed}
.lg-tabbar-dark .lg-tab{background:#35363a}
.lg-tab{display:flex;align-items:center;gap:8px;height:100%;padding:0 14px;border-radius:8px 8px 0 0;font:400 12px system-ui,sans-serif;min-width:150px}
.lg-px{image-rendering:pixelated;background:#202124;border-radius:4px}
.lg-squircle{border-radius:22.37%;overflow:hidden;box-shadow:0 10px 30px -10px rgb(0 0 0 / 0.8)}
`;

function TopStrip({
  Mark,
  state,
}: {
  Mark: (typeof OPTIONS)[number]["Mark"];
  state: MarkState;
}) {
  return (
    <div className="lg-strip">
      <div
        className={`lg-field ${state === "alert" ? "is-alert" : ""}`}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-2 px-4 pt-3">
        <div className="flex-1">
          <Mark state={state} size={44} />
        </div>
        <span className="glass relative grid size-12 shrink-0 place-items-center rounded-full">
          <House aria-hidden="true" className="size-6" strokeWidth={2} />
        </span>
        <span className="glass relative grid size-12 shrink-0 place-items-center rounded-full">
          <UserRound aria-hidden="true" className="size-6" strokeWidth={2} />
        </span>
      </div>
      <div className="relative px-4 pt-5">
        <p className="text-ink-2 text-lg">Estimated blood alcohol</p>
        <p className="text-[44px] leading-none font-medium tracking-[-0.05em]">
          <span className="text-2xl tracking-normal">about </span>
          {state === "alert" ? "0.08" : "0.00"}
        </p>
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const { only } = await searchParams;
  const shown = OPTIONS.filter((o) => !only || o.id === only.toUpperCase());
  return (
    <main className="text-ink min-h-svh bg-black px-6 py-8">
      <style>{STYLES}</style>
      {!only && (
        <>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">
            Logo: blue-to-red gradient
          </h1>
          <p className="text-ink-2 mt-1 text-lg">
            Corner-to-corner gradient with a centre dot; the whole mark goes red
            while it isn&apos;t safe to drive.
          </p>
        </>
      )}
      <div className="mt-8 flex flex-wrap items-start gap-8">
        {shown.map(({ id, name, rationale, Mark }) => (
          <section key={id} className="flex w-[375px] flex-col gap-5">
            <header>
              <h2 className="text-xl font-semibold">
                {id} · {name}
              </h2>
              <p className="text-ink-2 mt-1 min-h-[84px] text-base">
                {rationale}
              </p>
            </header>

            <TopStrip Mark={Mark} state="calm" />
            <TopStrip Mark={Mark} state="alert" />

            <div className="flex flex-col gap-3">
              <h3 className="text-ink-2 text-base font-medium">
                Favicon, calm
              </h3>
              <FaviconStrip id={id} state="calm" />
              <h3 className="text-ink-2 mt-2 text-base font-medium">
                Favicon, alert
              </h3>
              <FaviconStrip id={id} state="alert" />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-ink-2 text-base font-medium">
                App icon 180 and maskable 512 (shown at 160)
              </h3>
              <div className="flex items-start gap-4">
                <div
                  className="lg-squircle"
                  style={{ width: 180, height: 180 }}
                >
                  <Mark state="calm" size={180} bleed />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="relative" style={{ width: 160, height: 160 }}>
                    <Mark state="calm" size={160} bleed />
                    {/* Maskable safe zone: the centred circle of 80% diameter. */}
                    <span
                      className="absolute rounded-full border-2 border-dashed border-white/70"
                      style={{ inset: 16 }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="overflow-hidden rounded-full"
                  style={{ width: 96, height: 96 }}
                >
                  <Mark state="calm" size={96} bleed />
                </div>
                <div
                  className="overflow-hidden rounded-[28%]"
                  style={{ width: 96, height: 96 }}
                >
                  <Mark state="calm" size={96} bleed />
                </div>
                <div className="lg-squircle" style={{ width: 60, height: 60 }}>
                  <Mark state="alert" size={60} bleed />
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
