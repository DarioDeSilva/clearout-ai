import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { searchActiveListings } from "@/lib/ebay";
import { computePricing, buildSearchQuery, type ItemPricingContext } from "@/lib/pricing";
import { explainPricing } from "@/lib/gemini";
import { pricingPreferencesInputSchema } from "@/lib/validators";
import type { PricingResult } from "@/types/pricing";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = pricingPreferencesInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const preferences = parsed.data;

    const { data: item } = await supabase
      .from("items")
      .select("id, name, category, condition, brand, status")
      .eq("id", itemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.status !== "sell") {
      return NextResponse.json(
        { error: "Pricing is only available for items marked \"sell\"" },
        { status: 400 },
      );
    }

    if (!item.name || !item.category || !item.condition) {
      return NextResponse.json(
        { error: "Fill in name, category, and condition before pricing this item" },
        { status: 400 },
      );
    }

    // Upsert: a seller can come back and re-price after changing their
    // preferences, so this is "create or replace," not "create once."
    const { error: prefsError } = await supabase.from("item_pricing_preferences").upsert({
      item_id: itemId,
      selling_goal: preferences.sellingGoal,
      urgency: preferences.urgency,
      negotiable: preferences.negotiable,
      obo_or_firm: preferences.oboOrFirm,
      min_price: preferences.minPrice,
      zip_code: preferences.zipCode,
      delivery_available: preferences.deliveryAvailable,
      removal_difficulty: preferences.removalDifficulty,
      pickup_deadline: preferences.pickupDeadline,
      will_hold: preferences.willHold,
      undetectable_defects: preferences.undetectableDefects,
    });

    if (prefsError) {
      console.error("Failed to save pricing preferences:", prefsError.message);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    const itemContext: ItemPricingContext = {
      name: item.name,
      category: item.category,
      condition: item.condition,
      brand: item.brand,
    };

    const { data: job } = await supabase
      .from("jobs")
      .insert({ item_id: itemId, type: "price_estimate", status: "processing", started_at: new Date().toISOString() })
      .select("id")
      .single();

    try {
      const query = buildSearchQuery(itemContext);
      const rawComps = await searchActiveListings(query);

      if (rawComps.length > 0) {
        await supabase.from("price_comps").insert(
          rawComps.map((comp) => ({
            item_id: itemId,
            source: "ebay_active",
            query_used: query,
            title: comp.title,
            price: comp.price,
            condition: comp.condition,
            url: comp.url,
          })),
        );
      }

      // pricingPreferencesInputSchema's inferred type and the
      // PricingPreferences type the engine expects are structurally
      // identical (same fields, same shape) — no remapping needed.
      const computation = computePricing(rawComps, itemContext, preferences);
      const explanation = await explainPricing(computation, itemContext);

      if (job) {
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            output_data: { ...computation, query },
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }

      // min_price is deliberately absent from this response — it's used
      // above (via enforceMinimumFloor inside computePricing) but must
      // never appear in a client-facing API response body.
      const result: PricingResult = {
        quickSalePrice: computation.quickSalePrice,
        expectedRangeLow: computation.expectedRangeLow,
        expectedRangeHigh: computation.expectedRangeHigh,
        recommendedPrice: computation.recommendedPrice,
        oboOrFirm: computation.oboOrFirm,
        confidence: computation.confidence,
        explanation,
        compsUsed: computation.compsUsed,
        compsQualityNote: computation.compsQualityNote,
      };

      return NextResponse.json(result);
    } catch (pricingError) {
      console.error(`Pricing failed for item ${itemId}:`, pricingError);

      if (job) {
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            last_error: pricingError instanceof Error ? pricingError.message : "Unknown error",
            attempts: 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }

      return NextResponse.json({ error: "Failed to compute pricing" }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("POST /api/items/:id/price:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
