"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemCondition, ItemStatus } from "@/types/item";

interface ItemEditFormProps {
  item: Item;
  extractionFailed: boolean;
}

const CONDITIONS: ItemCondition[] = ["Like New", "Good", "Fair", "Poor"];
const STATUSES: ItemStatus[] = ["keep", "sell", "donate", "trash"];

export function ItemEditForm({ item, extractionFailed }: ItemEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(item.name ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [condition, setCondition] = useState<ItemCondition | "">(item.condition ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [ownedSince, setOwnedSince] = useState(item.owned_since ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // name/category are required (min length 1) when present, but
          // optional in the schema — send undefined instead of "" when
          // blank (e.g. extraction failed and nothing's been typed yet)
          // so the field is left untouched instead of failing validation.
          name: name || undefined,
          category: category || undefined,
          condition: condition || undefined,
          brand: brand || null,
          ownedSince: ownedSince || null,
          notes: notes || null,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      console.error("Item save failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${item.id}/retry`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Retry failed");
        return;
      }

      setName(data.name ?? "");
      setCategory(data.category ?? "");
      setCondition(data.condition ?? "");
      setBrand(data.brand ?? "");
      router.refresh();
    } catch (err) {
      console.error("Retry failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {extractionFailed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            AI extraction failed for this item. The photo is safe — you can retry or fill in the
            details yourself.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isRetrying ? "Retrying..." : "Retry extraction"}
          </button>
        </div>
      )}

      <label className="text-sm font-medium text-gray-700">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="text-sm font-medium text-gray-700">
        Category
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="text-sm font-medium text-gray-700">
        Condition
        <select
          value={condition}
          onChange={(event) => setCondition(event.target.value as ItemCondition | "")}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Not set</option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-gray-700">
        Brand
        <input
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="If known"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="text-sm font-medium text-gray-700">
        How long have you had it?
        <input
          value={ownedSince}
          onChange={(event) => setOwnedSince(event.target.value)}
          placeholder="Optional"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="text-sm font-medium text-gray-700">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Defects, accessories, anything else worth knowing"
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="text-sm font-medium text-gray-700">
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ItemStatus)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
