"use client";

import { useState } from "react";
import type { PricingPreferencesInput } from "@/lib/validators";
import type { PricingResult, SellingGoal, OboOrFirm } from "@/types/pricing";

interface PricingPanelProps {
  itemId: string;
  initialPreferences: PricingPreferencesInput;
}

const SELLING_GOALS: SellingGoal[] = ["quick", "balanced", "maximize"];
const OBO_OR_FIRM: OboOrFirm[] = ["obo", "firm"];

export function PricingPanel({ itemId, initialPreferences }: PricingPanelProps) {
  const [sellingGoal, setSellingGoal] = useState<SellingGoal>(initialPreferences.sellingGoal);
  const [urgency, setUrgency] = useState(initialPreferences.urgency ?? "");
  const [negotiable, setNegotiable] = useState(initialPreferences.negotiable);
  const [oboOrFirm, setOboOrFirm] = useState<OboOrFirm>(initialPreferences.oboOrFirm);
  const [minPrice, setMinPrice] = useState(
    initialPreferences.minPrice !== null ? String(initialPreferences.minPrice) : "",
  );
  const [zipCode, setZipCode] = useState(initialPreferences.zipCode ?? "");
  const [deliveryAvailable, setDeliveryAvailable] = useState(initialPreferences.deliveryAvailable);
  const [removalDifficulty, setRemovalDifficulty] = useState(initialPreferences.removalDifficulty ?? "");
  const [pickupDeadline, setPickupDeadline] = useState(initialPreferences.pickupDeadline ?? "");
  const [willHold, setWillHold] = useState(initialPreferences.willHold);
  const [undetectableDefects, setUndetectableDefects] = useState(
    initialPreferences.undetectableDefects ?? "",
  );

  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPricing, setIsPricing] = useState<boolean>(false);

  const handleGetPrice = async () => {
    setIsPricing(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${itemId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellingGoal,
          urgency: urgency || null,
          negotiable,
          oboOrFirm,
          minPrice: minPrice ? Number(minPrice) : null,
          zipCode: zipCode || null,
          deliveryAvailable,
          removalDifficulty: removalDifficulty || null,
          pickupDeadline: pickupDeadline || null,
          willHold,
          undetectableDefects: undetectableDefects || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to get a price recommendation");
        return;
      }

      setResult(data as PricingResult);
    } catch (err) {
      console.error("Pricing request failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsPricing(false);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>

      <div className="mt-3 flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-700">
          Selling goal
          <select
            value={sellingGoal}
            onChange={(event) => setSellingGoal(event.target.value as SellingGoal)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          >
            {SELLING_GOALS.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          How urgently does it need to go?
          <input
            value={urgency}
            onChange={(event) => setUrgency(event.target.value)}
            placeholder="Optional, e.g. 'gone by this weekend'"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={negotiable}
            onChange={(event) => setNegotiable(event.target.checked)}
          />
          Willing to negotiate
        </label>

        <label className="text-sm font-medium text-gray-700">
          List as
          <select
            value={oboOrFirm}
            onChange={(event) => setOboOrFirm(event.target.value as OboOrFirm)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          >
            {OBO_OR_FIRM.map((value) => (
              <option key={value} value={value}>
                {value === "obo" ? "OBO (open to offers)" : "Firm"}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Private minimum price
          <input
            type="number"
            min="0"
            step="1"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="Never shown publicly"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            This is a floor for the recommendations below — it never appears anywhere public.
          </span>
        </label>

        <label className="text-sm font-medium text-gray-700">
          ZIP code
          <input
            value={zipCode}
            onChange={(event) => setZipCode(event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={deliveryAvailable}
            onChange={(event) => setDeliveryAvailable(event.target.checked)}
          />
          Delivery available (not just pickup)
        </label>

        <label className="text-sm font-medium text-gray-700">
          Removal difficulty
          <input
            value={removalDifficulty}
            onChange={(event) => setRemovalDifficulty(event.target.value)}
            placeholder="Optional, e.g. 'needs 2 people, no elevator'"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Pickup deadline
          <input
            type="date"
            value={pickupDeadline}
            onChange={(event) => setPickupDeadline(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={willHold} onChange={(event) => setWillHold(event.target.checked)} />
          Willing to hold it for a buyer
        </label>

        <label className="text-sm font-medium text-gray-700">
          Defects not visible in the photo
          <textarea
            value={undetectableDefects}
            onChange={(event) => setUndetectableDefects(event.target.value)}
            placeholder="Optional"
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleGetPrice}
          disabled={isPricing}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPricing ? "Getting price..." : "Get Price Recommendation"}
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-gray-900">
              ${result.recommendedPrice} {result.oboOrFirm === "obo" ? "OBO" : "firm"}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                result.confidence === "medium"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {result.confidence} confidence
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Expected range: ${result.expectedRangeLow}-${result.expectedRangeHigh} · Quick-sale: $
            {result.quickSalePrice}
          </p>
          <p className="mt-3 text-sm text-gray-700">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}
