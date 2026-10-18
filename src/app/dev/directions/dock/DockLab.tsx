"use client";

import { Plus } from "lucide-react";

import type { QuickDrink } from "~/components/night/AddDock";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, formatBand, formatPoint, timeAgo } from "~/lib/estimate-display";
import { dockStatus, useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import "./dock.css";

type Std = (n: number) => string;

const VARIANTS: { id: string; name: string; note: string; Dock: (p: DockProps) => React.ReactNode }[] = [
  { id: "slab", name: "A · Ink slab (control)", note: "Today's shape, refined: verb first, light fill.", Dock: SlabDock },
  { id: "drink", name: "B · Drink first", note: "Same slab, but the drink is the headline and the verb is small.", Dock: DrinkFirstDock },
  { id: "tonal", name: "C · Tonal key", note: "Dark button with a visible edge; one round + key carries the action.", Dock: TonalDock },
  { id: "round", name: "D · Row + round key", note: "No slab: the drink on the left, a 72px key on the right, whole row tappable.", Dock: RoundDock },
  { id: "list", name: "E · Grouped list", note: "The dock as one native list: repeat on top, recents below, + on each row.", Dock: ListDock },
];

interface DockProps {
  night: SampleNight;
  std: Std;
}

export function DockLab() {
  const night = useSampleNight();
  const { std } = useRegion();
  return (
    <main className="dlab">
      <header>
        <h1>Dock round</h1>
        <p>Five ways to show &ldquo;add the same again&rdquo;. All are one tap, at least 64px tall, full width, fixed at the bottom. Try them: the buttons work.</p>
      </header>
      <div className="dlab-row">
        {VARIANTS.map(({ id, name, note, Dock }) => (
          <section key={id} className="dlab-col" aria-label={name}>
            <h2>{name}</h2>
            <p>{note}</p>
            <div className="dlab-phone">
              <Screen night={night} std={std} />
              <div className="dlab-dock">
                <Status night={night} std={std} />
                <Dock night={night} std={std} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

/** The top of the night screen, compact, so each dock is seen in context. */
function Screen({ night }: DockProps) {
  const bac = night.model.bac ?? 0;
  const [lo, hi] = formatBand(bac).split("–");
  return (
    <div className="dlab-screen">
      <div className="dlab-top">
        <span className="dlab-word">BACulator</span>
        <span className="dlab-chip">Get home</span>
        <span className="dlab-chip">You</span>
      </div>
      <p className="dlab-warn">
        <WarningMark className="size-5" />
        <span>Not safe to drive</span>
      </p>
      <div className="dlab-est">
        <p className="dlab-label">Estimated blood alcohol</p>
        <p className="dlab-num">
          <span>about</span>
          <span className="dlab-big">{formatPoint(bac)}</span>
        </p>
        <p className="dlab-range">
          Likely {lo} to {hi}
        </p>
      </div>
    </div>
  );
}

function Status({ night, std }: DockProps) {
  const s = dockStatus(night, std);
  return (
    <div className="dlab-status">
      <p aria-live="polite">
        <span key={s.live?.at ?? "idle"} className="snack inline">
          {s.lead && <span className={s.live ? "dlab-strong" : "dlab-dim"}>{s.lead}: </span>}
          <span className="dlab-strong">{s.label}</span>
          {!s.live && night.last && <span className="dlab-dim"> · {timeAgo(night.last.finishedAt, night.now)}</span>}
        </span>
      </p>
      {s.action && (
        <button type="button" className="dlab-undo" onClick={night.undo}>
          {s.action}
        </button>
      )}
    </div>
  );
}

function Recents({ night, std, list = false }: DockProps & { list?: boolean }) {
  const recents = night.recents.slice(0, 2);
  return (
    <div className={list ? "dlab-list-rest" : "dlab-recents"}>
      {recents.map((d) => (
        <button key={`${d.name}|${d.standards}`} type="button" className={list ? "dlab-listrow" : "dlab-recent"} onClick={() => night.add(d)}>
          <DrinkIcon kind={drinkKind(d)} className="size-5" />
          <span className="dlab-recent-text">
            <span className="dlab-recent-name">{drinkLabel(d, std)}</span>
            <span className="dlab-recent-std">{std(d.standards)} std</span>
          </span>
          {list && <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.25} />}
        </button>
      ))}
      <button type="button" className={list ? "dlab-listrow dlab-new" : "dlab-new-tile"}>
        {list ? (
          <>
            <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            <span className="dlab-recent-name">New drink</span>
          </>
        ) : (
          "New drink"
        )}
      </button>
    </div>
  );
}

const repeatOf = (night: SampleNight): QuickDrink | null => night.repeat;

function SlabDock({ night, std }: DockProps) {
  const r = repeatOf(night);
  if (!r) return null;
  return (
    <>
      <button type="button" className="dlab-slab" onClick={() => night.add(r)}>
        <Plus aria-hidden="true" className="size-6" strokeWidth={2.25} />
        <span>
          <span className="dlab-slab-verb">Add another</span>
          <span className="dlab-slab-sub">
            {drinkLabel(r, std)} · {std(r.standards)} std
          </span>
        </span>
      </button>
      <Recents night={night} std={std} />
    </>
  );
}

function DrinkFirstDock({ night, std }: DockProps) {
  const r = repeatOf(night);
  if (!r) return null;
  return (
    <>
      <button type="button" className="dlab-slab dlab-slab-drink" onClick={() => night.add(r)} aria-label={`Add another ${drinkLabel(r, std)}`}>
        <span className="min-w-0 flex-1">
          <span className="dlab-slab-sub dlab-small-verb">Add another</span>
          <span className="dlab-slab-name">{drinkLabel(r, std)}</span>
        </span>
        <span className="dlab-slab-std">{std(r.standards)} std</span>
        <span className="dlab-slab-key">
          <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
        </span>
      </button>
      <Recents night={night} std={std} />
    </>
  );
}

function TonalDock({ night, std }: DockProps) {
  const r = repeatOf(night);
  if (!r) return null;
  return (
    <>
      <button type="button" className="dlab-tonal" onClick={() => night.add(r)} aria-label={`Add another ${drinkLabel(r, std)}`}>
        <DrinkIcon kind={drinkKind(r)} className="size-6" />
        <span className="min-w-0 flex-1">
          <span className="dlab-tonal-name">{drinkLabel(r, std)}</span>
          <span className="dlab-tonal-sub">Add another · {std(r.standards)} std</span>
        </span>
        <span className="dlab-key">
          <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </span>
      </button>
      <Recents night={night} std={std} />
    </>
  );
}

function RoundDock({ night, std }: DockProps) {
  const r = repeatOf(night);
  if (!r) return null;
  return (
    <>
      <button type="button" className="dlab-roundrow" onClick={() => night.add(r)} aria-label={`Add another ${drinkLabel(r, std)}`}>
        <span className="min-w-0 flex-1">
          <span className="dlab-round-name">{drinkLabel(r, std)}</span>
          <span className="dlab-tonal-sub">Add another · {std(r.standards)} std</span>
        </span>
        <span className="dlab-key dlab-key-lg">
          <Plus aria-hidden="true" className="size-8" strokeWidth={2.5} />
        </span>
      </button>
      <Recents night={night} std={std} />
    </>
  );
}

function ListDock({ night, std }: DockProps) {
  const r = repeatOf(night);
  if (!r) return null;
  return (
    <div className="dlab-list">
      <button type="button" className="dlab-listrow dlab-listhead" onClick={() => night.add(r)} aria-label={`Add another ${drinkLabel(r, std)}`}>
        <DrinkIcon kind={drinkKind(r)} className="size-6" />
        <span className="dlab-recent-text">
          <span className="dlab-tonal-name">{drinkLabel(r, std)}</span>
          <span className="dlab-tonal-sub">Add another · {std(r.standards)} std</span>
        </span>
        <span className="dlab-key">
          <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </span>
      </button>
      <Recents night={night} std={std} list />
    </div>
  );
}
