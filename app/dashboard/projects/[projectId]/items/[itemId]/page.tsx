import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getItemPhotoUrl } from "@/lib/storage";
import type { Item } from "@/types/item";
import { ItemEditForm } from "./item-edit-form";

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
    </div>
  );
}
