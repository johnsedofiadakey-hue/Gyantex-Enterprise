import {
  getColorwayImages,
  hasTextileOptions,
  type CatalogProduct,
  type ProductVariant,
  type TextileColorway,
} from "@/lib/catalog";

/**
 * Colour matching for "More in this colour" suggestions.
 *
 * A colourway's colours come from its NAME when the name contains colour
 * words ("Black & Red"), and from its swatches otherwise. Names win because
 * they're what the owner deliberately typed — swatches are often left at the
 * form's default black/white. The admin form warns when the two disagree
 * (getColourNameMismatch), so both can be kept honest.
 *
 * Distances are CIE76 ΔE in Lab space, which tracks how different two colours
 * look far better than raw RGB distance does.
 */

type Lab = [number, number, number];

/** Reference shades for colour words, longest phrases matched first. */
const NAMED_COLOURS: Array<[string, string]> = [
  ["light blue", "#7fb8e6"],
  ["sky blue", "#7fb8e6"],
  ["navy blue", "#1b2a4a"],
  ["wine", "#6d1a24"],
  ["maroon", "#6d1a24"],
  ["burgundy", "#6d1a24"],
  ["black", "#111111"],
  ["white", "#ffffff"],
  ["red", "#d61f1f"],
  ["pink", "#e86aa6"],
  ["magenta", "#d0208f"],
  ["purple", "#6b2fa0"],
  ["violet", "#6b2fa0"],
  ["lilac", "#b99ad6"],
  ["navy", "#1b2a4a"],
  ["blue", "#1f4fbf"],
  ["teal", "#1e7a72"],
  ["green", "#2e8b3e"],
  ["lime", "#9acd32"],
  ["olive", "#6b7a2a"],
  ["yellow", "#f2c511"],
  ["lemon", "#f2e14c"],
  ["gold", "#c9a227"],
  ["orange", "#f07c1b"],
  ["peach", "#f6b38f"],
  ["brown", "#6f4a2a"],
  ["coffee", "#6f4a2a"],
  ["chocolate", "#4e3020"],
  ["cream", "#efe4c8"],
  ["ivory", "#efe4c8"],
  ["beige", "#e3d3b0"],
  ["grey", "#8a8a8a"],
  ["gray", "#8a8a8a"],
  ["ash", "#8a8a8a"],
  ["silver", "#c0c0c0"],
];

/** Colours closer than this read as "the same colour" to a shopper. */
const SAME_COLOUR_DISTANCE = 22;

function hexToLab(hex: string): Lab | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].split("").map((d) => d + d).join("") : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Colour words found in a name, in order, e.g. "Black & Red" → black, red. */
function namedColoursIn(name: string): Array<{ word: string; lab: Lab }> {
  let text = ` ${name.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  const found: Array<{ word: string; lab: Lab; at: number }> = [];
  for (const [word, hex] of NAMED_COLOURS) {
    const at = text.indexOf(` ${word} `);
    if (at === -1) continue;
    found.push({ word, lab: hexToLab(hex)!, at });
    text = text.slice(0, at) + " ".repeat(word.length + 1) + text.slice(at + word.length + 1);
  }
  return found.sort((a, b) => a.at - b.at);
}

function swatchColours(hex?: string, hex2?: string): Lab[] {
  return [hex, hex2].map((value) => (value ? hexToLab(value) : null)).filter((lab): lab is Lab => lab !== null);
}

/** The colours a shopper would say this option is. */
export function getColourSet(option: { name?: string; hex?: string; hex2?: string }): Lab[] {
  const named = option.name ? namedColoursIn(option.name) : [];
  return named.length ? named.map((colour) => colour.lab) : swatchColours(option.hex, option.hex2);
}

/**
 * How different two colour sets look: every colour in each set is paired
 * with its nearest in the other, both ways, and averaged. Identical sets
 * score 0; "Black & Red" vs "Black & White" scores high despite sharing
 * black, because red has no partner — which is what a shopper expects.
 */
function colourSetDistance(a: Lab[], b: Lab[]): number {
  if (!a.length || !b.length) return Infinity;
  const oneWay = (from: Lab[], to: Lab[]) => from.reduce((sum, colour) => sum + Math.min(...to.map((other) => deltaE(colour, other))), 0) / from.length;
  return (oneWay(a, b) + oneWay(b, a)) / 2;
}

function nearestColourWord(lab: Lab): string {
  let best = NAMED_COLOURS[0][0];
  let bestDistance = Infinity;
  for (const [word, hex] of NAMED_COLOURS) {
    const distance = deltaE(lab, hexToLab(hex)!);
    if (distance < bestDistance) {
      best = word;
      bestDistance = distance;
    }
  }
  return best;
}

const titleCase = (words: string[]) => words.map((word) => word.replace(/\b\w/g, (c) => c.toUpperCase())).join(" & ");

/**
 * Admin warning when a colourway's name and swatches describe different
 * colours — e.g. named "Black & Red" but swatches still at black/white.
 * Returns null when they agree, or when the name has no colour words.
 */
export function getColourNameMismatch(option: { name: string; hex?: string; hex2?: string }): string | null {
  const named = namedColoursIn(option.name);
  const swatches = swatchColours(option.hex, option.hex2);
  if (!named.length || !swatches.length) return null;
  const distance = colourSetDistance(named.map((colour) => colour.lab), swatches);
  if (distance <= SAME_COLOUR_DISTANCE) return null;
  const swatchWords = [...new Set(swatches.map(nearestColourWord))];
  return `The name says ${titleCase(named.map((colour) => colour.word))}, but the swatches look ${titleCase(swatchWords)}. Customers are matched to similar colours using the name, so set the swatches to match too.`;
}

export interface ProductSuggestion {
  product: CatalogProduct;
  /** The colourway that matched, so the card shows that colour's photo and
   * opening it pre-selects that colour. */
  colorway?: TextileColorway;
  image: string;
}

interface ColourOption {
  colorway?: TextileColorway;
  colours: Lab[];
  image?: string;
}

function colourOptionsOf(product: CatalogProduct): ColourOption[] {
  if (hasTextileOptions(product)) {
    return (product.textileFabrics || [])
      .filter((fabric) => fabric.active !== false)
      .flatMap((fabric) => fabric.colorways.filter((colorway) => colorway.active !== false))
      .map((colorway) => ({ colorway, colours: getColourSet(colorway), image: getColorwayImages(colorway)[0] }));
  }
  return (product.variants || [])
    .filter((variant) => variant.inStock !== false)
    .map((variant) => ({ colours: getColourSet({ name: variant.color, hex: variant.hex, hex2: variant.hex2 }), image: variant.image }));
}

/**
 * "You might also like" for a product. With a colour selected, other
 * products that come in a matching colour, closest first — each showing its
 * matching colour's photo. With no colour selected (or nothing matching),
 * products from the same category, as before.
 */
export function getSuggestedProducts(
  allProducts: CatalogProduct[],
  product: CatalogProduct,
  selection: { colorway?: TextileColorway | null; variant?: ProductVariant | null },
  limit = 8
): { mode: "colour" | "category"; items: ProductSuggestion[] } {
  const others = allProducts.filter((candidate) => candidate.id !== product.id);
  const selected = selection.colorway
    ? getColourSet(selection.colorway)
    : selection.variant
      ? getColourSet({ name: selection.variant.color, hex: selection.variant.hex, hex2: selection.variant.hex2 })
      : [];

  if (selected.length) {
    const matches = others
      .map((candidate) => {
        const best = colourOptionsOf(candidate)
          .map((option) => ({ option, distance: colourSetDistance(selected, option.colours) }))
          .sort((a, b) => a.distance - b.distance)[0];
        return best && { candidate, ...best };
      })
      .filter((match): match is NonNullable<typeof match> => Boolean(match) && match!.distance <= SAME_COLOUR_DISTANCE)
      .sort((a, b) => a.distance - b.distance || Number(b.candidate.category === product.category) - Number(a.candidate.category === product.category));

    // A matching colourway with no photo of its own would show the product's
    // main photo — often a different colour entirely — under "More in Red".
    // Those only appear when nothing with a real photo matches.
    const withOwnPhoto = matches.filter((match) => match.option.image);
    const shown = withOwnPhoto.length ? withOwnPhoto : matches;

    if (shown.length) {
      return {
        mode: "colour",
        items: shown.slice(0, limit).map(({ candidate, option }) => ({
          product: candidate,
          colorway: option.colorway,
          image: option.image || candidate.imageUrl,
        })),
      };
    }
  }

  return {
    mode: "category",
    items: others
      .filter((candidate) => candidate.category === product.category)
      .slice(0, limit)
      .map((candidate) => ({ product: candidate, image: candidate.imageUrl })),
  };
}
