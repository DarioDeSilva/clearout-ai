export type ItemStatus = "keep" | "sell" | "donate" | "trash";

export type ItemCondition = "Like New" | "Good" | "Fair" | "Poor";

export interface Item {
  id: string;
  project_id: string;
  name: string | null;
  category: string | null;
  condition: ItemCondition | null;
  brand: string | null;
  owned_since: string | null;
  notes: string | null;
  status: ItemStatus;
  listing_title: string | null;
  listing_description: string | null;
  created_at: string;
}
