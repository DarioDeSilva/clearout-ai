import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Project } from "@/types/project";
import { NewProjectForm } from "./new-project-form";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: true })
    .returns<Project[]>();

  if (error) {
    console.error("Failed to load projects:", error.message);
    throw new Error("Failed to load projects");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Projects</h1>

      <div className="mt-4">
        <NewProjectForm />
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="block rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
            >
              {project.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
