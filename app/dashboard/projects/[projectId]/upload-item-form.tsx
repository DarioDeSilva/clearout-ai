"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface UploadItemFormProps {
  projectId: string;
}

export function UploadItemForm({ projectId }: UploadItemFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError("Choose a photo first");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("photo", file);
      body.append("projectId", projectId);

      const response = await fetch("/api/items", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      router.push(`/dashboard/projects/${projectId}/items/${data.id}`);
      router.refresh();
    } catch (err) {
      console.error("Item upload failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-sm text-gray-700"
      />
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Add Item"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
