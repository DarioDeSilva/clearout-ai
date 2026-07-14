import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function getItemPhotoUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("item-photos")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    console.error("Failed to create signed photo URL:", error.message);
    return null;
  }

  return data.signedUrl;
}
