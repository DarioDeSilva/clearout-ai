import { z } from "zod";

export const itemExtractionSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  condition: z.enum(["Like New", "Good", "Fair", "Poor"]),
  brand: z.string().nullable(),
});

export type ItemExtraction = z.infer<typeof itemExtractionSchema>;

export const createItemInputSchema = z.object({
  projectId: z.uuid("Invalid project ID"),
});

export const updateItemInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  condition: z.enum(["Like New", "Good", "Fair", "Poor"]).optional(),
  brand: z.string().max(100).nullable().optional(),
  ownedSince: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["keep", "sell", "donate", "trash"]).optional(),
});

export const pricingPreferencesInputSchema = z.object({
  sellingGoal: z.enum(["quick", "balanced", "maximize"]),
  urgency: z.string().max(200).nullable(),
  negotiable: z.boolean(),
  oboOrFirm: z.enum(["obo", "firm"]),
  minPrice: z.number().positive().nullable(),
  zipCode: z.string().max(20).nullable(),
  deliveryAvailable: z.boolean(),
  removalDifficulty: z.string().max(200).nullable(),
  pickupDeadline: z.string().max(50).nullable(),
  willHold: z.boolean(),
  undetectableDefects: z.string().max(2000).nullable(),
});

export type PricingPreferencesInput = z.infer<typeof pricingPreferencesInputSchema>;
