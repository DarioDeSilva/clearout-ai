import { z } from "zod";

export const itemExtractionSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  condition: z.enum(["Like New", "Good", "Fair", "Poor"]),
  brand: z.string().nullable(),
});

export type ItemExtraction = z.infer<typeof itemExtractionSchema>;
