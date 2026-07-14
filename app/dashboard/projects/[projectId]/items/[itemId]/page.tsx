import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getItemPhotoUrl } from "@/lib/storage";
import type { Item } from "@/types/item";
import type { PricingPreferencesInput } from "@/lib/validators";
import { ItemEditForm } from "./item-edit-form";
import { PricingPanel } from "./pricing-panel";

const DEFAULT_PRICING_PREFERENCES: PricingPreferencesInput = {
  sellingGoal: "balanced",
  urgency: null,
  negotiable: true,
  oboOrFirm: "firm",
  minPrice: null,
  zipCode: null,
  deliveryAvailable: false,
  removalDifficulty: null,
  pickupDeadline: null,
  willHold: false,
  undetectableDefects: null,
};

interface ItemDetailPageProps {
  params: Promise<{ projectId: string; itemId: string }>;
}

interface ItemWithPhotos extends Item {
  item_photos: { storage_path: string }[];
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { projectId, itemId } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("items")
    .select(
      "id, project_id, name, category, condition, brand, owned_since, notes, status, listing_title, listing_description, created_at, item_photos(storage_path)",
    )
    .eq("id", itemId)
    .eq("project_id", projectId)
    .maybeSingle<ItemWithPhotos>();

  if (!item) {
    notFound();
  }

  const photoUrl = item.item_photos[0]
    ? await getItemPhotoUrl(supabase, item.item_photos[0].storage_path)
    : null;

  const { data: latestJob } = await supabase
    .from("jobs")
    .select("status, last_error")
    .eq("item_id", item.id)
    .eq("type", "extract_item")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pricingPreferences = DEFAULT_PRICING_PREFERENCES;

  if (item.status === "sell") {
    const { data: savedPreferences } = await supabase
      .from("item_pricing_preferences")
      .select(
        "selling_goal, urgency, negotiable, obo_or_firm, min_price, zip_code, delivery_available, removal_difficulty, pickup_deadline, will_hold, undetectable_defects",
      )
      .eq("item_id", item.id)
      .maybeSingle();

    if (savedPreferences) {
      pricingPreferences = {
        sellingGoal: savedPreferences.selling_goal ?? DEFAULT_PRICING_PREFERENCES.sellingGoal,
        urgency: savedPreferences.urgency,
        negotiable: savedPreferences.negotiable ?? DEFAULT_PRICING_PREFERENCES.negotiable,
        oboOrFirm: savedPreferences.obo_or_firm ?? DEFAULT_PRICING_PREFERENCES.oboOrFirm,
        minPrice: savedPreferences.min_price,
        zipCode: savedPreferences.zip_code,
        deliveryAvailable:
          savedPreferences.delivery_available ?? DEFAULT_PRICING_PREFERENCES.deliveryAvailable,
        removalDifficulty: savedPreferences.removal_difficulty,
        pickupDeadline: savedPreferences.pickup_deadline,
        willHold: savedPreferences.will_hold ?? DEFAULT_PRICING_PREFERENCES.willHold,
        undetectableDefects: savedPreferences.undetectable_defects,
      };
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={item.name ?? "Item photo"}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <ItemEditForm item={item} extractionFailed={latestJob?.status === "failed"} />
      </div>

      {item.status === "sell" && (
        <PricingPanel itemId={item.id} initialPreferences={pricingPreferences} />
      )}
    </div>
  );
}
