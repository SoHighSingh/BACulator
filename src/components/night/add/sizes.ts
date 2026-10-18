import type { Region, Serve } from "~/lib/region";

export interface SizeOption {
  /** What the drink is called at this size: "Pint of beer", "Large glass of wine". */
  label: string;
  /** Short name for the size row: "Pint". */
  size: string;
  volumeMl: number;
}

type Kind = "beer" | "can" | "seltzer" | "wine" | "spirit" | "cocktail";

function kindOf(serve: Serve): Kind {
  const n = serve.label.toLowerCase();
  if (n.includes("seltzer")) return "seltzer";
  if (/can|stubby|premix|bottle/.test(n) && !n.includes("wine")) return "can";
  if (/beer|pint|schooner|pot/.test(n)) return "beer";
  if (n.includes("wine")) return "wine";
  if (/nip|shot|spirit|liquor/.test(n)) return "spirit";
  return "cocktail";
}

// One row per size people actually order, biggest last. Volumes are the region's real serves
// (Australian glasses; US 12 / 16 / 22 oz, 5 / 9 oz pours, 1.5 oz shots).
const METRIC: Record<Kind, SizeOption[]> = {
  beer: [
    { label: "Pot of beer", size: "Pot or middy", volumeMl: 285 },
    { label: "Schooner of beer", size: "Schooner", volumeMl: 425 },
    { label: "Pint of beer", size: "Pint", volumeMl: 570 },
  ],
  can: [
    { label: "Can, stubby or premix", size: "Can or stubby", volumeMl: 375 },
    { label: "Tall can", size: "Tall can", volumeMl: 500 },
    { label: "Longneck", size: "Longneck", volumeMl: 750 },
  ],
  seltzer: [
    { label: "Hard seltzer", size: "Can", volumeMl: 355 },
    { label: "Tall hard seltzer", size: "Tall can", volumeMl: 473 },
  ],
  wine: [
    { label: "Small glass of wine", size: "Small glass", volumeMl: 100 },
    { label: "Glass of wine", size: "Glass", volumeMl: 150 },
    { label: "Large glass of wine", size: "Large glass", volumeMl: 250 },
  ],
  spirit: [
    { label: "Nip of spirits", size: "Nip", volumeMl: 30 },
    { label: "Double nip of spirits", size: "Double", volumeMl: 60 },
  ],
  cocktail: [
    { label: "Cocktail", size: "Standard", volumeMl: 150 },
    { label: "Large cocktail", size: "Large", volumeMl: 250 },
  ],
};

const US: Record<Kind, SizeOption[]> = {
  beer: [
    { label: "Can or bottle of beer", size: "Can or bottle", volumeMl: 355 },
    { label: "Pint of beer", size: "Pint", volumeMl: 473 },
    { label: "Large beer", size: "Large (22 oz)", volumeMl: 651 },
  ],
  can: [
    { label: "Can or bottle of beer", size: "Can or bottle", volumeMl: 355 },
    { label: "Tall can of beer", size: "Tall can", volumeMl: 473 },
    { label: "Large can of beer", size: "Large (22 oz)", volumeMl: 651 },
  ],
  seltzer: [
    { label: "Hard seltzer", size: "Can", volumeMl: 355 },
    { label: "Tall hard seltzer", size: "Tall can", volumeMl: 473 },
  ],
  wine: [
    { label: "Glass of wine", size: "Glass", volumeMl: 148 },
    { label: "Large glass of wine", size: "Large glass", volumeMl: 266 },
  ],
  spirit: [
    { label: "Shot of liquor", size: "Shot", volumeMl: 44 },
    { label: "Double shot of liquor", size: "Double", volumeMl: 89 },
  ],
  cocktail: [
    { label: "Cocktail", size: "Standard", volumeMl: 150 },
    { label: "Large cocktail", size: "Large", volumeMl: 250 },
  ],
};

/**
 * The sizes a quick-pick serve comes in, with the serve itself always among them (so the default
 * is one of the rows). Sorted smallest first.
 */
export function sizesFor(serve: Serve, region: Region): SizeOption[] {
  const table = region.id === "us" ? US : METRIC;
  const options = [...table[kindOf(serve)]];
  if (!options.some((o) => o.volumeMl === serve.volumeMl)) {
    options.push({ label: serve.label, size: serve.label, volumeMl: serve.volumeMl });
  }
  return options.sort((a, b) => a.volumeMl - b.volumeMl);
}
