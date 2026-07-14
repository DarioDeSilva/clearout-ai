import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extractItemFromPhoto } from "@/lib/gemini";
import type { Item } from "@/types/item";

const ITEM_COLUMNS =
  "id, project_id, name, category, condition, brand, owned_since, notes, status, listing_title, listing_description, created_at";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: photoRow } = await supabase
      .from("item_photos")
      .select("storage_path")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!photoRow) {
      return NextResponse.json({ error: "No photo found for this item" }, { status: 404 });
    }

    const { data: photoBlob, error: downloadError } = await supabase.storage
      .from("item-photos")
      .download(photoRow.storage_path);

    if (downloadError || !photoBlob) {
      console.error("Failed to download photo for retry:", downloadError?.message);
      return NextResponse.json({ error: "Failed to load photo" }, { status: 500 });
    }

    const photoBytes = Buffer.from(await photoBlob.arrayBuffer());
    const mimeType = photoBlob.type || "image/jpeg";

    const { data: job } = await supabase
      .from("jobs")
      .insert({ item_id: itemId, type: "extract_item", status: "processing", started_at: new Date().toISOString() })
      .select("id")
      .single();

    try {
      const extracted = await extractItemFromPhoto(photoBytes, mimeType);

      const { data: updated, error: updateError } = await supabase
        .from("items")
        .update({
          name: extracted.name,
          category: extracted.category,
          condition: extracted.condition,
          brand: extracted.brand,
        })
        .eq("id", itemId)
        .select(ITEM_COLUMNS)
        .single<Item>();

      if (updateError || !updated) {
        throw updateError ?? new Error("Failed to save extracted fields");
      }

      if (job) {
        await supabase
          .from("jobs")
          .update({ status: "completed", output_data: extracted, completed_at: new Date().toISOString() })
          .eq("id", job.id);
      }

      return NextResponse.json(updated);
    } catch (extractionError) {
      console.error(`Retry extraction failed for item ${itemId}:`, extractionError);

      if (job) {
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            last_error: extractionError instanceof Error ? extractionError.message : "Unknown error",
            attempts: 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }

      return NextResponse.json({ error: "Extraction failed again" }, { status: 502 });
    }
  } catch (error) {
    console.error("POST /api/items/:id/retry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
