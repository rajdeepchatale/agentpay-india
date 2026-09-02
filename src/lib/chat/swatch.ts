// ============================================================
// Woven placeholders, built from the saree's own colours.
// ============================================================
// No product photography exists yet, and a shopping interface with sixteen
// grey rectangles where the goods should be is not a shopping interface.
//
// A saree in this catalog is described the way the merchant actually describes
// it — a body colour and a border: ['Green', 'Yellow Border']. That maps
// directly onto the material we already have: cloth for the body, a kaath
// (woven selvedge) for the border. So the fallback is not a generic gradient
// with a letter on it; it is that specific saree, in its own colours.
//
// When real photography lands it simply sits on top and this never renders.
// ============================================================

/** The catalog's colour vocabulary, mapped onto this world's palette. */
const COLORS: Record<string, string> = {
  /* Longest keys are matched first, so "navy blue" never collapses to "blue"
     and "gold" inside "Gold Asawali Border" is found without the motif name
     confusing it. */
  "navy blue": "#2a3a5c",
  maroon: "#6d2230",
  indigo: "#31407a",
  purple: "#553272",
  golden: "#c9a227",
  green: "#3f7d4e",
  brown: "#6b4a2f",
  white: "#e6e3dc",
  black: "#26262e",
  wine: "#5d2333",
  gold: "#c9a227",
  blue: "#31558a",
  pink: "#a8446a",
  red: "#a32b34",
  grey: "#6a6a76",
  gray: "#6a6a76",
  cream: "#ded5c4",
  peach: "#c98a63",
  teal: "#2f6f70",
  yellow: "#d9a520",
  orange: "#c46a2a",
  silver: "#a8adb8",
  beige: "#cbbfa8",
};

const KEYS = Object.keys(COLORS).sort((a, b) => b.length - a.length);

/** Neutral cloth for a colour we do not recognise. Never undefined. */
const FALLBACK_BODY = "#3a3a46";
const FALLBACK_SELVEDGE = "#c9a227";

export interface Swatch {
  /** The saree's body colour. */
  body: string;
  /** The selvedge — the kaath running its length. */
  selvedge: string;
  /** Set on the cloth when there is no photograph. */
  initial: string;
}

export interface SwatchInput {
  id: string;
  name: string;
  colors: string[];
}

/**
 * Find a known colour inside a catalog phrase.
 *
 * The catalog says "Gold Asawali Border", not "gold" — the motif and the word
 * "border" are description, not colour. Scanning for the longest known key
 * inside the phrase pulls the colour out without needing the catalog to be
 * rewritten into machine-friendly shapes.
 */
function resolve(phrase: string | undefined): string | null {
  if (!phrase) return null;
  const haystack = phrase.toLowerCase();
  for (const key of KEYS) {
    if (haystack.includes(key)) return COLORS[key];
  }
  return null;
}

export function swatchFor(product: SwatchInput): Swatch {
  const body = resolve(product.colors[0]) ?? FALLBACK_BODY;
  let selvedge = resolve(product.colors[1]) ?? FALLBACK_SELVEDGE;

  /* A selvedge the same colour as the body renders as a flat block and the
     band disappears. Fall back to zari — which is what a real saree border
     usually is anyway. */
  if (selvedge === body) {
    selvedge = body === FALLBACK_SELVEDGE ? FALLBACK_BODY : FALLBACK_SELVEDGE;
  }

  return {
    body,
    selvedge,
    initial: product.name.trim().charAt(0).toUpperCase() || "S",
  };
}
