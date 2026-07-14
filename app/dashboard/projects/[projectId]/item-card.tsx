import Link from "next/link";
import type { Item } from "@/types/item";

interface ItemCardProps {
  item: Item;
  projectId: string;
  photoUrl: string | null;
}

export function ItemCard({ item, projectId, photoUrl }: ItemCardProps) {
  return (
    <Link
      href={`/dashboard/projects/${projectId}/items/${item.id}`}
      className="block overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300"
    >
      <div className="aspect-square bg-gray-100">
        {photoUrl && (
          // Signed URLs are per-request and external (Supabase storage
          // domain) — plain <img> avoids configuring next/image's remote
          // pattern allowlist for a URL that changes on every load anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={item.name ?? "Item photo"}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-gray-900">{item.name ?? "Processing..."}</p>
        <p className="text-sm text-gray-500">{item.category ?? "—"}</p>
      </div>
    </Link>
  );
}
