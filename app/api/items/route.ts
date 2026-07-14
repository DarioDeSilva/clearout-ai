import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extractItemFromPhoto } from "@/lib/gemini";
import { createItemInputSchema } from "@/lib/validators";
import type { Item } from "@/types/item";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ITEM_COLUMNS =
  "id, project_id, name, category, condition, brand, owned_since, notes, status, listing_title, listing_description, created_at";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get("photo");

    const parsed = createItemInputSchema.safeParse({
      projectId: formData.get("projectId"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Photo is required" }, { status: 400 });
    }

    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const { projectId } = parsed.data;

    // Confirm this project actually belongs to the user before attaching
    // an item to it. items' own RLS policy only checks that the item's
    // user_id matches the caller — it has no way to know whether
    // project_id points at a project that same user actually owns.
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert({ user_id: user.id, project_id: projectId })
      .select(ITEM_COLUMNS)
      .single<Item>();

    if (itemError || !item) {
      console.error("Failed to create item:", itemError?.message);
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }

    const photoBytes = Buffer.from(await photo.arrayBuffer());
    const extension = photo.type.split("/")[1];
    const storagePath = `${user.id}/${item.id}/photo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(storagePath, photoBytes, { contentType: photo.type });

    if (uploadError) {
      console.error("Failed to upload photo:", uploadError.message);
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }

    await supabase.from("item_photos").insert({ item_id: item.id, storage_path: storagePath });

    const { data: job } = await supabase
      .from("jobs")
      .insert({ item_id: item.id, type: "extract_item", status: "processing", started_at: new Date().toISOString() })
      .select("id")
      .single();

    try {
      const extracted = await extractItemFromPhoto(photoBytes, photo.type);

      const { data: updatedItem, error: updateError } = await supabase
        .from("items")
        .update({
          name: extracted.name,
          category: extracted.category,
          condition: extracted.condition,
          brand: extracted.brand,
        })
        .eq("id", item.id)
        .select(ITEM_COLUMNS)
        .single<Item>();

      if (updateError || !updatedItem) {
        throw updateError ?? new Error("Failed to save extracted fields");
      }

      if (job) {
        await supabase
          .from("jobs")
          .update({ status: "completed", output_data: extracted, completed_at: new Date().toISOString() })
          .eq("id", job.id);
      }

      return NextResponse.json(updatedItem, { status: 201 });
    } catch (extractionError) {
      console.error(`Extraction failed for item ${item.id}:`, extractionError);

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

      // The item and photo were still created successfully — extraction
      // is a sub-step whose failure is reported via the item's own
      // (still-null) fields plus the job record, not by failing the
      // whole request. The item detail page offers a retry.
      return NextResponse.json(item, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/items:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
