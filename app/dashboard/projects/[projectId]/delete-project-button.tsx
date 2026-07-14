"use client";

import { useState } from "react";
import { deleteProject } from "../actions";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
  itemCount: number;
}

export function DeleteProjectButton({ projectId, projectName, itemCount }: DeleteProjectButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    const itemWarning =
      itemCount > 0
        ? ` This will permanently delete ${itemCount} item${itemCount === 1 ? "" : "s"} inside it.`
        : "";
    const confirmed = window.confirm(
      `Delete "${projectName}"?${itemWarning} This can't be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteProject(projectId);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Delete project failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete Project"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
