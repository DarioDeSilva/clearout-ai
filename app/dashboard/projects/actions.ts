"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Keep it under 100 characters"),
});

interface CreateProjectResult {
  error?: string;
}

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: parsed.data.name });

  if (error) {
    console.error("Failed to create project:", error.message);
    return { error: "Failed to create project" };
  }

  revalidatePath("/dashboard/projects");
  return {};
}

interface DeleteProjectResult {
  error?: string;
}

export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  // .select("id") makes the delete return the row(s) it actually removed.
  // RLS silently deletes zero rows for a project that isn't this user's
  // (rather than erroring), so checking the returned data is how we tell
  // "deleted" apart from "not yours" / "doesn't exist."
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .select("id");

  if (error) {
    console.error("Failed to delete project:", error.message);
    return { error: "Failed to delete project" };
  }

  if (!data || data.length === 0) {
    return { error: "Project not found" };
  }

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}
