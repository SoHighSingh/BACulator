"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { formatStandards } from "~/lib/estimate-display";
import { guessRegion, isRegionId, REGIONS, toRegionStandards, type Region, type RegionId } from "~/lib/region";

const STORAGE_KEY = "baculator.region";

interface RegionContextValue {
  region: Region;
  setRegion: (id: RegionId) => void;
  /** Stored 10 g standards, written in this region's standard drinks: "1.6" */
  std: (stored: number) => string;
}

const RegionContext = createContext<RegionContextValue | null>(null);

function readStored(): RegionId | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isRegionId(value) ? value : null;
  } catch {
    return null;
  }
}

/** Region is a per-device preference; nothing about it is stored on the server. */
export function RegionProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<RegionId>("metric");

  useEffect(() => {
    setId(readStored() ?? guessRegion(navigator.languages));
  }, []);

  const setRegion = useCallback((next: RegionId) => {
    setId(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice still holds for this visit.
    }
  }, []);

  const value = useMemo<RegionContextValue>(() => {
    const region = REGIONS[id];
    return { region, setRegion, std: (stored) => formatStandards(toRegionStandards(stored, region)) };
  }, [id, setRegion]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const value = useContext(RegionContext);
  if (!value) throw new Error("useRegion needs a RegionProvider");
  return value;
}
