import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Project } from "@/types/project";
import { DeleteProjectButton } from "./delete-project-button";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
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

  // head: true means "give me the count, not the rows" — no item data is
  // actually fetched, just how many exist for this project.
  const { count: itemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <DeleteProjectButton
          projectId={project.id}
          projectName={project.name}
          itemCount={itemCount ?? 0}
        />
      </div>
      <p className="mt-2 text-gray-600">
        No items yet — photo upload is coming in the next milestone.
      </p>
    </div>
  );
}
