export type SellingGoal = "quick" | "balanced" | "maximize";
export type OboOrFirm = "obo" | "firm";
export type PricingConfidence = "high" | "medium" | "low";

export interface PricingPreferences {
  sellingGoal: SellingGoal;
  urgency: string | null;
  negotiable: boolean;
  oboOrFirm: OboOrFirm;
  minPrice: number | null;
  zipCode: string | null;
  deliveryAvailable: boolean;
  removalDifficulty: string | null;
  pickupDeadline: string | null;
  willHold: boolean;
  undetectableDefects: string | null;
}

export interface PriceComp {
  source: string;
  queryUsed: string;
  title: string;
  price: number;
  condition: string | null;
  url: string;
}

/**
 * What the pricing API returns. Deliberately has no minPrice field — the
 * private minimum is used server-side to compute these numbers but must
 * never appear in a response body.
 */
export interface PricingResult {
  quickSalePrice: number;
  expectedRangeLow: number;
  expectedRangeHigh: number;
  recommendedPrice: number;
  oboOrFirm: OboOrFirm;
  confidence: PricingConfidence;
  explanation: string;
  compsUsed: number;
  compsQualityNote: string;
}
