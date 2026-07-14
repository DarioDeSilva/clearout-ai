import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Project } from "@/types/project";

const DEFAULT_PROJECT_NAME = "My Items";

export default async function DashboardIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The layout above this page already redirects to /login if there's no
  // user, so this is just satisfying TypeScript, not a real auth check.
  if (!user) {
    redirect("/login");
  }

  const { data: existing, error } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<Project[]>();

  if (error) {
    console.error("Failed to load projects:", error.message);
    throw new Error("Failed to load projects");
  }

  let defaultProject = existing[0];

  if (!defaultProject) {
    // First time this user has ever hit the dashboard — create their
    // default project so uploading a first item never requires setting
    // one up manually.
    const { data: created, error: createError } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: DEFAULT_PROJECT_NAME })
      .select("id, name, created_at")
      .single<Project>();

    if (createError || !created) {
      console.error("Failed to create default project:", createError?.message);
      throw new Error("Failed to create default project");
    }

    defaultProject = created;
  }

  redirect(`/dashboard/projects/${defaultProject.id}`);
}
