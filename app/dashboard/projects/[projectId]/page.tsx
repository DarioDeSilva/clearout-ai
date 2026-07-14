import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getItemPhotoUrl } from "@/lib/storage";
import type { Project } from "@/types/project";
import type { Item } from "@/types/item";
import { DeleteProjectButton } from "./delete-project-button";
import { UploadItemForm } from "./upload-item-form";
import { ItemCard } from "./item-card";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

interface ItemWithPhotos extends Item {
  item_photos: { storage_path: string }[];
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .eq("id", projectId)
    .maybeSingle<Project>();

  // RLS means a project ID belonging to another user comes back as null
  // here, not an error — from this page's point of view that's
  // indistinguishable from a project that doesn't exist at all, which is
  // exactly the behavior we want (no leaking "that ID exists, but isn't
  // yours" information).
  if (!project) {
    notFound();
  }

  const { data: items, error } = await supabase
    .from("items")
    .select(
      "id, project_id, name, category, condition, brand, owned_since, notes, status, listing_title, listing_description, created_at, item_photos(storage_path)",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .returns<ItemWithPhotos[]>();

  if (error) {
    console.error("Failed to load items:", error.message);
    throw new Error("Failed to load items");
  }

  const itemsWithPhotoUrls = await Promise.all(
    items.map(async (item) => ({
      item,
      photoUrl: item.item_photos[0]
        ? await getItemPhotoUrl(supabase, item.item_photos[0].storage_path)
        : null,
    })),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <DeleteProjectButton
          projectId={project.id}
          projectName={project.name}
          itemCount={items.length}
        />
      </div>

      <div className="mt-4">
        <UploadItemForm projectId={project.id} />
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-gray-600">
          No items yet — upload a photo above to add your first one.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {itemsWithPhotoUrls.map(({ item, photoUrl }) => (
            <ItemCard key={item.id} item={item} projectId={project.id} photoUrl={photoUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
