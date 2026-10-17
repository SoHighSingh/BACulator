import { useRef, useState } from "react";

import type { DrinkDetails } from "~/lib/drinks/details";
import { api } from "~/trpc/react";

export interface NewDrink {
  standards: number;
  finishedAt: Date;
  details?: Partial<DrinkDetails> & { name?: string };
}

export interface LoggedDrink {
  id: string;
  standards: number;
  finishedAt: Date;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
}

// Ignore a second identical add within this window: a drunk double-tap should log one drink.
const DUPLICATE_WINDOW_MS = 4000;

/** Tonight's drinks (last 24 h, any session), recents for one-tap adds, and add/remove with undo. */
export function useNight() {
  const utils = api.useUtils();
  const nightQuery = api.post.getNight.useQuery(undefined, { refetchOnWindowFocus: true });
  const recentsQuery = api.post.recentDrinks.useQuery(undefined, { refetchOnWindowFocus: false });
  const [error, setError] = useState<string | null>(null);
  const lastAdd = useRef<{ key: string; at: number } | null>(null);

  const refresh = () => Promise.all([utils.post.getNight.invalidate(), utils.post.recentDrinks.invalidate()]);

  const addMutation = api.post.addDrink.useMutation({ onSettled: refresh });
  const removeMutation = api.post.deleteDrink.useMutation({ onSettled: refresh });

  const drinks: LoggedDrink[] = (nightQuery.data ?? []).map((d) => ({
    id: d.id,
    standards: d.standards,
    finishedAt: new Date(d.finishedAt),
    name: d.name,
    volumeMl: d.volumeMl,
    abv: d.abv,
    count: d.count,
  }));

  async function add(drink: NewDrink): Promise<LoggedDrink | null> {
    const key = `${drink.details?.name ?? ""}|${drink.standards}|${Math.round(drink.finishedAt.getTime() / 60000)}`;
    const now = Date.now();
    if (lastAdd.current && lastAdd.current.key === key && now - lastAdd.current.at < DUPLICATE_WINDOW_MS) return null;
    lastAdd.current = { key, at: now };
    setError(null);
    try {
      const { name, volumeMl, abv, count, source, confidence, rawText } = drink.details ?? {};
      const created = await addMutation.mutateAsync({
        standards: drink.standards,
        finishedAt: drink.finishedAt.toISOString(),
        details: { name, volumeMl, abv, count, source, confidence, rawText },
      });
      return { ...created, finishedAt: new Date(created.finishedAt) };
    } catch {
      lastAdd.current = null;
      setError("Couldn't save that drink. Check your connection and try again.");
      return null;
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await removeMutation.mutateAsync({ drinkId: id });
      return true;
    } catch {
      setError("Couldn't remove that drink. Try again.");
      return false;
    }
  }

  return {
    drinks,
    recents: recentsQuery.data ?? [],
    isLoading: nightQuery.isLoading,
    isSaving: addMutation.isPending,
    error,
    add,
    remove,
  };
}
