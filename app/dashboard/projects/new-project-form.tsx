"use client";

import { useState } from "react";
import { createProject } from "./actions";

export function NewProjectForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProject(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Create project submission failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input
        name="name"
        type="text"
        placeholder="New project name"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "New Project"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
