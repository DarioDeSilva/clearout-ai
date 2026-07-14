import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { updateItemInputSchema } from "@/lib/validators";
import type { Item } from "@/types/item";

const ITEM_COLUMNS =
  "id, project_id, name, category, condition, brand, owned_since, notes, status, listing_title, listing_description, created_at";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
    const parsed = updateItemInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { ownedSince, ...rest } = parsed.data;

    const { data: updated, error } = await supabase
      .from("items")
      .update({ ...rest, owned_since: ownedSince })
      .eq("id", itemId)
      .select(ITEM_COLUMNS)
      .maybeSingle<Item>();

    if (error) {
      console.error("Failed to update item:", error.message);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("PATCH /api/items/:id:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
