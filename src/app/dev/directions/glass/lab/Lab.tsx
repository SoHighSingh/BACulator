"use client";

import { Beer, CupSoda, GlassWater, Martini, Plus, Search, TriangleAlert, UserRound, Wine, X } from "lucide-react";
import { useState } from "react";

import type { QuickDrink } from "~/components/night/AddDock";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, formatPoint, timeAgo } from "~/lib/estimate-display";
import { servesFor } from "~/lib/region";
import { dockStatus, useSampleNight, type SampleNight } from "../../_kit/useSampleNight";
import { Curve, Estimate, lightAt, Rows } from "../Night";

type Std = (n: number) => string;
interface P {
  night: SampleNight;
  std: Std;
}

const FRAMES: { id: string; name: string; note: string; Warn: (p: P) => React.ReactNode; Dock: (p: P) => React.ReactNode; warnInHeader?: boolean }[] = [
  { id: "composer", name: "1 · Composer", note: "Drink as a chip, round + to add. Warning: glass pill, icon in coral, words in white.", Warn: WarnPill, Dock: ComposerDock },
  { id: "segmented", name: "2 · Segmented", note: "Same again plus two recents as equal segments. Warning: coral-tinted glass.", Warn: WarnTint, Dock: SegmentDock },
  { id: "pill", name: "3 · White pill", note: "One full-width capsule, recents as pills. Warning lives in the top bar.", Warn: () => null, Dock: PillDock, warnInHeader: true },
  { id: "list", name: "4 · Command list", note: "A glass list, Add on the first row. Warning: one line, no box.", Warn: WarnLine, Dock: ListDock },
];

export function GlassLab() {
  const night = useSampleNight();
  const { std } = useRegion();
  return (
    <main className="min-h-svh bg-black px-6 pt-8 pb-16">
      <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Add flow in Glass</h1>
      <p className="mt-1 text-lg text-[var(--g-ink-2)]">Four docks, four warning treatments, and the new-drink sheet. Every button works.</p>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,375px)] gap-6">
        {FRAMES.map((f) => (
          <section key={f.id} aria-label={f.name}>
            <h2 className="text-lg font-semibold">{f.name}</h2>
            <p className="min-h-14 text-base text-[var(--g-ink-2)]">{f.note}</p>
            <Phone night={night} std={std} warnInHeader={f.warnInHeader} warn={<f.Warn night={night} std={std} />} dock={<f.Dock night={night} std={std} />} />
          </section>
        ))}
        <section aria-label="New drink">
          <h2 className="text-lg font-semibold">5 · New drink sheet</h2>
          <p className="min-h-14 text-base text-[var(--g-ink-2)]">Quick add first (type, size, add), recents, then &ldquo;or type it&rdquo;. No keyboard unless you tap the field.</p>
          <div className="relative h-[812px] w-[375px] overflow-hidden rounded-[40px] bg-[var(--g-bg)] shadow-[inset_0_0_0_1px_var(--g-edge)]">
            <NewDrinkSheet night={night} std={std} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Phone({ night, std, warn, dock, warnInHeader }: P & { warn: React.ReactNode; dock: React.ReactNode; warnInHeader?: boolean }) {
  return (
    <div className="relative h-[812px] w-[375px] overflow-hidden rounded-[40px] bg-[var(--g-bg)] shadow-[inset_0_0_0_1px_var(--g-edge)]">
      <div className="absolute inset-0 overflow-y-auto">
        <div className="g-field" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 px-4 pt-3 pb-[330px]">
          <header className="g-glass sticky top-2 z-20 flex items-center gap-1 rounded-2xl py-2 pr-2 pl-4">
            {warnInHeader ? (
              <span className="flex flex-1 items-center gap-2 text-lg font-medium">
                <TriangleAlert aria-hidden="true" className="size-5 text-[var(--g-alert)]" strokeWidth={2.25} />
                Not safe to drive
              </span>
            ) : (
              <span className="flex-1 text-lg font-semibold tracking-[-0.02em]">BACulator</span>
            )}
            <span className="flex min-h-12 items-center rounded-xl px-3 text-lg font-medium">Get home</span>
            <span className="flex min-h-12 items-center gap-1.5 rounded-xl px-2 text-lg font-medium">
              <UserRound aria-hidden="true" className="size-5" strokeWidth={2} />
              You
            </span>
          </header>
          {warn}
          <Estimate night={night} />
          {night.model.simulation && <Curve simulation={night.model.simulation} now={night.now} />}
          <Rows night={night} std={std} />
        </div>
      </div>
      <div className="g-glass g-glass-strong absolute inset-x-2 bottom-2 z-30 rounded-[30px] p-3">
        <Status night={night} std={std} />
        {dock}
      </div>
    </div>
  );
}

function Status({ night, std }: P) {
  const s = dockStatus(night, std);
  return (
    <div className="flex min-h-12 items-center gap-3 px-2 pb-1">
      <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
        <span key={s.live?.at ?? "idle"} className="snack inline">
          {s.lead && <span className="text-[var(--g-ink-2)]">{s.lead}: </span>}
          <span className="font-medium">{s.label}</span>
          {!s.live && night.last && <span className="text-[var(--g-ink-2)]"> · {timeAgo(night.last.finishedAt, night.now)}</span>}
        </span>
      </p>
      {s.action && (
        <button type="button" onClick={night.undo} className="g-press min-h-12 shrink-0 rounded-full bg-white/10 px-4 text-lg font-medium hover:bg-white/15">
          {s.action}
        </button>
      )}
    </div>
  );
}

/* ---------- warnings ---------- */

function WarnPill({ night }: P) {
  return (
    <p role="status" className="g-glass sticky top-[84px] z-10 flex min-h-12 items-center gap-3 rounded-full px-4 text-lg font-medium">
      <WarningMark className="size-5 text-[var(--g-alert)]" />
      <span className="flex-1">Not safe to drive</span>
      <span className="text-[var(--g-ink-2)]">about {formatPoint(night.model.bac ?? 0)}</span>
    </p>
  );
}

function WarnTint({ night }: P) {
  return (
    <p
      role="status"
      className="sticky top-[84px] z-10 flex min-h-12 items-center gap-3 rounded-2xl px-4 text-lg font-medium text-[#ffd3cb] shadow-[inset_0_0_0_1px_rgb(255_164_148/0.35)] backdrop-blur-xl"
      style={{ background: "rgb(255 120 100 / 0.14)" }}
    >
      <WarningMark className="size-5 text-[var(--g-alert)]" />
      <span className="flex-1">Not safe to drive</span>
      <span className="text-[var(--g-ink)]">about {formatPoint(night.model.bac ?? 0)}</span>
    </p>
  );
}

function WarnLine({ night }: P) {
  return (
    <p role="status" className="flex min-h-12 items-center gap-2.5 px-1 text-lg font-medium">
      <WarningMark className="size-5 text-[var(--g-alert)]" />
      Not safe to drive
      <span className="text-[var(--g-ink-2)]">· about {formatPoint(night.model.bac ?? 0)}</span>
    </p>
  );
}

/* ---------- docks ---------- */

const recentsOf = (night: SampleNight) => night.recents.slice(0, 2);

function ComposerDock({ night, std }: P) {
  const r = night.repeat;
  if (!r) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2 overflow-x-auto px-1 pb-0.5">
        {recentsOf(night).map((d) => (
          <button
            key={`${d.name}|${d.standards}`}
            type="button"
            onClick={() => night.add(d)}
            className="g-press flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:bg-white/10"
          >
            <DrinkIcon kind={drinkKind(d)} className="size-5 text-[var(--g-ink-2)]" />
            {drinkLabel(d, std)}
          </button>
        ))}
        <button type="button" className="g-press flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-4 text-lg text-[var(--g-ink-2)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
          New
        </button>
      </div>
      <button
        type="button"
        onClick={() => night.add(r)}
        onPointerMove={lightAt}
        aria-label={`Add another ${drinkLabel(r, std)}`}
        className="g-press g-lit flex min-h-[80px] items-center gap-3 rounded-[24px] bg-white/[0.07] py-2.5 pr-2.5 pl-3 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10">
          <DrinkIcon kind={drinkKind(r)} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xl font-medium">{drinkLabel(r, std)}</span>
          <span className="block text-lg text-[var(--g-ink-2)]">Same again · {std(r.standards)} std</span>
        </span>
        <span className="grid size-[60px] shrink-0 place-items-center rounded-full bg-[var(--g-ink)] text-[var(--g-bg)]">
          <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}

function SegmentDock({ night, std }: P) {
  const r = night.repeat;
  if (!r) return null;
  const items: (QuickDrink & { first?: boolean })[] = [{ ...r, first: true }, ...recentsOf(night)];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5 rounded-[24px] bg-white/[0.04] p-1.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        {items.map((d) => (
          <button
            key={`${d.name}|${d.standards}|${d.first ? 1 : 0}`}
            type="button"
            onClick={() => night.add(d)}
            className={`g-press flex min-h-[96px] flex-col items-start justify-between rounded-[18px] p-3 text-left ${
              d.first ? "bg-[var(--g-ink)] text-[var(--g-bg)]" : "hover:bg-white/[0.06]"
            }`}
          >
            <span className="flex w-full items-center justify-between">
              <DrinkIcon kind={drinkKind(d)} className="size-5" />
              {d.first && <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />}
            </span>
            <span>
              <span className="line-clamp-2 text-lg leading-tight font-medium">{drinkLabel(d, std)}</span>
              <span className={`block text-lg leading-tight ${d.first ? "text-[#3f3f46]" : "text-[var(--g-ink-2)]"}`}>{std(d.standards)} std</span>
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="g-press flex min-h-12 items-center justify-center gap-2 rounded-full text-lg font-medium hover:bg-white/5">
        <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
        New drink
      </button>
    </div>
  );
}

function PillDock({ night, std }: P) {
  const r = night.repeat;
  if (!r) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => night.add(r)}
        className="g-press flex min-h-[72px] items-center justify-center gap-2.5 rounded-full bg-[var(--g-ink)] px-6 text-xl font-medium text-[var(--g-bg)] shadow-[0_8px_30px_-8px_rgb(124_180_255/0.6)]"
      >
        <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
        <span className="truncate">Add another {drinkLabel(r, std).toLowerCase()}</span>
      </button>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        {recentsOf(night).map((d) => (
          <button
            key={`${d.name}|${d.standards}`}
            type="button"
            onClick={() => night.add(d)}
            className="g-press flex min-h-14 min-w-0 items-center gap-2 rounded-full bg-white/[0.06] px-3.5 text-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
          >
            <DrinkIcon kind={drinkKind(d)} className="size-5 shrink-0 text-[var(--g-ink-2)]" />
            <span className="truncate">{drinkLabel(d, std)}</span>
          </button>
        ))}
        <button type="button" aria-label="New drink" className="g-press grid size-14 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]">
          <Plus aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function ListDock({ night, std }: P) {
  const r = night.repeat;
  if (!r) return null;
  const rows: (QuickDrink & { first?: boolean })[] = [{ ...r, first: true }, ...recentsOf(night)];
  return (
    <div className="overflow-hidden rounded-[22px] bg-white/[0.04] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
      {rows.map((d, i) => (
        <button
          key={`${d.name}|${d.standards}|${i}`}
          type="button"
          onClick={() => night.add(d)}
          onPointerMove={lightAt}
          className={`g-press g-lit flex w-full items-center gap-3 px-4 text-left ${d.first ? "min-h-[72px] bg-white/[0.06]" : "min-h-14 border-t border-white/[0.07]"}`}
        >
          <DrinkIcon kind={drinkKind(d)} className="size-5 text-[var(--g-ink-2)]" />
          <span className="min-w-0 flex-1 truncate text-lg font-medium">{drinkLabel(d, std)}</span>
          <span className="text-lg text-[var(--g-ink-2)]">{std(d.standards)} std</span>
          {d.first ? (
            <span className="flex min-h-11 items-center gap-1 rounded-full bg-[var(--g-ink)] px-4 text-lg font-medium text-[var(--g-bg)]">
              <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
              Add
            </span>
          ) : (
            <Plus aria-hidden="true" className="size-5 text-[var(--g-ink-2)]" strokeWidth={2} />
          )}
        </button>
      ))}
      <button type="button" className="flex min-h-14 w-full items-center gap-3 border-t border-white/[0.07] px-4 text-lg text-[var(--g-ink-2)]">
        <Search aria-hidden="true" className="size-5" strokeWidth={2} />
        New drink
      </button>
    </div>
  );
}

/* ---------- new drink sheet ---------- */

const TYPES = [
  { id: "beer", label: "Beer", Icon: Beer, abv: 4.8, match: /pot|middy|schooner|pint|can|stubby|bottle/i, name: "lager" },
  { id: "wine", label: "Wine", Icon: Wine, abv: 13, match: /wine|glass/i, name: "wine" },
  { id: "spirit", label: "Spirit", Icon: GlassWater, abv: 40, match: /nip|shot|spirit/i, name: "spirit" },
  { id: "cocktail", label: "Cocktail", Icon: Martini, abv: 15, match: /cocktail/i, name: "cocktail" },
  { id: "rtd", label: "Cider or can", Icon: CupSoda, abv: 5, match: /can|bottle|pint|seltzer|premix/i, name: "cider" },
] as const;
const WHEN = ["Now", "15 min ago", "30 min ago", "1 hour ago"];

function NewDrinkSheet({ night, std }: P) {
  const { region } = useRegion();
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("beer");
  const [serve, setServe] = useState(0);
  const [when, setWhen] = useState(0);
  const t = TYPES.find((x) => x.id === type)!;
  const allServes = servesFor(region);
  const serves = allServes.filter((s) => t.match.test(s.label)).slice(0, 4);
  const list = serves.length ? serves : allServes.slice(0, 4);
  const picked = list[Math.min(serve, list.length - 1)]!;
  const standards = Math.ceil(((picked.volumeMl * picked.abv * 0.789) / 1000) * 10) / 10;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="pointer-events-none absolute inset-0 bg-black/50" />
      <div className="g-glass g-glass-strong absolute inset-x-0 bottom-0 top-10 flex flex-col overflow-y-auto rounded-t-[32px] px-4 pt-3 pb-6">
        <span className="mx-auto h-1.5 w-10 rounded-full bg-white/25" aria-hidden="true" />
        <header className="mt-3 flex items-center justify-between">
          <h3 className="text-[22px] font-semibold tracking-[-0.02em]">New drink</h3>
          <button type="button" aria-label="Close" className="grid size-12 place-items-center rounded-full bg-white/10">
            <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
        </header>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setType(id);
                setServe(0);
              }}
              aria-pressed={type === id}
              className={`g-press flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-base leading-tight font-medium ${
                type === id ? "bg-[var(--g-ink)] text-[var(--g-bg)]" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
              }`}
            >
              <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
              <span className="text-center">{label}</span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-lg text-[var(--g-ink-2)]">Size</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {list.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setServe(i)}
              aria-pressed={serve === i}
              className={`g-press flex min-h-14 items-center justify-between rounded-2xl px-4 text-lg ${
                serve === i ? "bg-white/[0.14] shadow-[inset_0_0_0_2px_var(--g-ink)]" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
              }`}
            >
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-lg text-[var(--g-ink-2)]">When</p>
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {WHEN.map((w, i) => (
            <button
              key={w}
              type="button"
              onClick={() => setWhen(i)}
              aria-pressed={when === i}
              className={`g-press min-h-12 shrink-0 rounded-full px-4 text-lg ${when === i ? "bg-[var(--g-ink)] text-[var(--g-bg)]" : "bg-white/[0.06]"}`}
            >
              {w}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => night.add({ standards, name: picked.label, volumeMl: picked.volumeMl, abv: picked.abv, count: 1 })}
          className="g-press mt-5 flex min-h-[64px] items-center justify-center gap-2 rounded-full bg-[var(--g-ink)] text-xl font-medium text-[var(--g-bg)]"
        >
          <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
          Add {picked.label.toLowerCase()} · {std(standards)} std
        </button>

        <p className="mt-6 text-lg text-[var(--g-ink-2)]">Or type it</p>
        <label className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white/[0.06] px-4 shadow-[inset_0_0_0_1px_var(--g-edge-2)]">
          <Search aria-hidden="true" className="size-5 text-[var(--g-ink-2)]" strokeWidth={2} />
          <input
            type="text"
            placeholder={region.example}
            className="min-w-0 flex-1 bg-transparent text-lg text-[var(--g-ink)] placeholder:text-[var(--g-ink-2)] focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
