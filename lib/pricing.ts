import type { RawEbayListing } from "@/lib/ebay";
import type { OboOrFirm, PricingConfidence, PricingPreferences } from "@/types/pricing";

export interface ItemPricingContext {
  name: string;
  category: string;
  condition: string;
  brand: string | null;
}

export interface PricingComputation {
  quickSalePrice: number;
  expectedRangeLow: number;
  expectedRangeHigh: number;
  recommendedPrice: number;
  oboOrFirm: OboOrFirm;
  confidence: PricingConfidence;
  compsUsed: number;
  compsQualityNote: string;
}

/**
 * eBay's Browse API only returns active (asking-price) listings, not
 * confirmed sales — real "sold" data requires the restricted Marketplace
 * Insights API. This markdown is a hand-picked heuristic to compensate,
 * not a scientifically derived number; there's nothing to calibrate it
 * against until real sale outcomes exist. See ARCHITECTURE.md.
 */
const ACTIVE_LISTING_MARKDOWN = 0.88;

const BROKEN_KEYWORDS = ["parts only", "for parts", "not working", "broken"];
const BUNDLE_KEYWORDS = ["bundle", "lot of", "set of"];
const NEW_KEYWORDS = ["brand new", "new in box", "nib"];

export function buildSearchQuery(itemContext: ItemPricingContext): string {
  const name = itemContext.name.trim();
  const brand = itemContext.brand?.trim();

  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${name}`;
  }

  return name || itemContext.category;
}

function filterIrrelevantListings(comps: RawEbayListing[], itemCondition: string): RawEbayListing[] {
  const itemIsPoor = itemCondition === "Poor";

  return comps.filter((comp) => {
    if (comp.price <= 0) return false;

    const titleLower = comp.title.toLowerCase();

    // A "for parts / not working" comp is a legitimate comparison only if
    // our own item is also in poor shape — otherwise it'll drag the price
    // down for an item that isn't actually broken.
    const isBrokenListing = BROKEN_KEYWORDS.some((keyword) => titleLower.includes(keyword));
    if (isBrokenListing && !itemIsPoor) return false;

    const isBundleListing = BUNDLE_KEYWORDS.some((keyword) => titleLower.includes(keyword));
    if (isBundleListing) return false;

    const isNewListing = NEW_KEYWORDS.some((keyword) => titleLower.includes(keyword));
    if (isNewListing && itemCondition !== "Like New") return false;

    return true;
  });
}

function filterOutlierShipping(comps: RawEbayListing[]): RawEbayListing[] {
  return comps.filter((comp) => {
    if (comp.shippingCost === null) return true;
    // A listing where shipping costs more than half the item price is
    // usually a sign the seller folded shipping into a padded price, or
    // it's a heavy/oversized item that isn't comparable to ours.
    return comp.shippingCost <= comp.price * 0.5;
  });
}

function percentile(sortedValues: number[], p: number): number {
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

interface RobustStats {
  median: number;
  low: number;
  high: number;
}

function computeRobustStats(prices: number[]): RobustStats | null {
  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const trimmed = sorted.filter((price) => price >= lowerFence && price <= upperFence);
  const finalSorted = trimmed.length > 0 ? trimmed : sorted;

  return {
    median: percentile(finalSorted, 0.5),
    low: percentile(finalSorted, 0.25),
    high: percentile(finalSorted, 0.75),
  };
}

/**
 * Hand-tuned starting multipliers, not derived from real sale data (there
 * isn't any yet). Electronics depreciate fastest, collectibles/antiques
 * don't really depreciate at all in the same way. Refine once
 * sale_outcomes data exists (see ARCHITECTURE.md's "Phase 2" note).
 */
function getCategoryMultiplier(category: string): number {
  const categoryLower = category.toLowerCase();

  if (["electronic", "computer", "phone", "laptop", "tablet"].some((kw) => categoryLower.includes(kw))) {
    return 0.85;
  }
  if (["furniture"].some((kw) => categoryLower.includes(kw))) {
    return 0.95;
  }
  if (["appliance"].some((kw) => categoryLower.includes(kw))) {
    return 0.9;
  }
  if (["collectible", "antique", "vintage"].some((kw) => categoryLower.includes(kw))) {
    return 1.0;
  }

  return 0.88;
}

const CONDITION_MULTIPLIER: Record<string, number> = {
  "Like New": 1.0,
  Good: 0.9,
  Fair: 0.75,
  Poor: 0.55,
};

function applySellerStrategy(
  baseLow: number,
  baseMedian: number,
  baseHigh: number,
  preferences: PricingPreferences,
): { quickSalePrice: number; expectedRangeLow: number; expectedRangeHigh: number; recommendedPrice: number } {
  let recommended: number;

  switch (preferences.sellingGoal) {
    case "quick":
      recommended = baseLow;
      break;
    case "maximize":
      recommended = baseHigh;
      break;
    case "balanced":
    default:
      recommended = baseMedian;
      break;
  }

  // OBO lists above the actual target to leave room for negotiation down
  // to it; firm means the recommended number IS the number to accept.
  if (preferences.oboOrFirm === "obo") {
    recommended *= 1.1;
  }

  return {
    quickSalePrice: Math.round(baseLow * 0.9),
    expectedRangeLow: Math.round(baseLow),
    expectedRangeHigh: Math.round(baseHigh),
    recommendedPrice: Math.round(recommended),
  };
}

function enforceMinimumFloor<T extends Record<string, number>>(prices: T, minPrice: number | null): T {
  if (minPrice === null) return prices;

  const floored = { ...prices };
  for (const key of Object.keys(floored) as (keyof T)[]) {
    floored[key] = Math.max(floored[key], minPrice) as T[keyof T];
  }
  return floored;
}

/**
 * Active-listings-only data (no confirmed sales) caps confidence at
 * "medium" — never "high" — regardless of how many comps came back.
 */
function computeConfidence(compCount: number, low: number, high: number, median: number): PricingConfidence {
  if (compCount < 3) return "low";

  const spread = median > 0 ? (high - low) / median : 1;

  if (compCount >= 5 && spread < 0.6) return "medium";

  return "low";
}

export function computePricing(
  rawComps: RawEbayListing[],
  itemContext: ItemPricingContext,
  preferences: PricingPreferences,
): PricingComputation {
  const filtered = filterOutlierShipping(filterIrrelevantListings(rawComps, itemContext.condition));
  const prices = filtered.map((comp) => comp.price);
  const stats = computeRobustStats(prices);

  if (!stats) {
    const fallback = enforceMinimumFloor(
      { quickSalePrice: 0, expectedRangeLow: 0, expectedRangeHigh: 0, recommendedPrice: 0 },
      preferences.minPrice,
    );
    return {
      ...fallback,
      oboOrFirm: preferences.oboOrFirm,
      confidence: "low",
      compsUsed: 0,
      compsQualityNote: "No comparable eBay listings were found for this item.",
    };
  }

  const adjustment =
    ACTIVE_LISTING_MARKDOWN *
    getCategoryMultiplier(itemContext.category) *
    (CONDITION_MULTIPLIER[itemContext.condition] ?? 0.8);

  const strategyPrices = applySellerStrategy(
    stats.low * adjustment,
    stats.median * adjustment,
    stats.high * adjustment,
    preferences,
  );
  const finalPrices = enforceMinimumFloor(strategyPrices, preferences.minPrice);

  return {
    ...finalPrices,
    oboOrFirm: preferences.oboOrFirm,
    confidence: computeConfidence(filtered.length, stats.low, stats.high, stats.median),
    compsUsed: filtered.length,
    compsQualityNote:
      filtered.length < rawComps.length
        ? `${filtered.length} of ${rawComps.length} eBay listings were used after filtering out irrelevant results (new, parts-only, bundles, etc).`
        : `${filtered.length} eBay listings were used.`,
  };
}
