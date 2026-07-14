import { GoogleGenAI, createUserContent, createPartFromBase64, createPartFromText } from "@google/genai";
import { itemExtractionSchema, type ItemExtraction } from "@/lib/validators";
import type { PricingComputation, ItemPricingContext } from "@/lib/pricing";

// gemini-2.5-flash is deprecated for new API keys (still listed by the
// models endpoint, but generateContent 404s on it) — gemini-3.5-flash is
// the current stable, non-preview flash-tier model as of this writing.
const MODEL = "gemini-3.5-flash";

const EXTRACTION_PROMPT = `You are looking at a photo of a single household item someone is deciding whether to keep, sell, donate, or throw away.

Identify the item and respond with ONLY a JSON object (no markdown, no commentary) matching this exact shape:
{
  "name": string,        // a short, specific name for the item, e.g. "IKEA Poang armchair"
  "category": string,    // a general category, e.g. "Furniture", "Electronics", "Kitchenware"
  "condition": "Like New" | "Good" | "Fair" | "Poor",
  "brand": string | null // the visible brand/manufacturer if identifiable, otherwise null
}

If you cannot identify the item at all, use "Unknown item" as the name and "Fair" as the condition.`;

export async function extractItemFromPhoto(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ItemExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: createUserContent([
        createPartFromText(EXTRACTION_PROMPT),
        createPartFromBase64(imageBytes.toString("base64"), mimeType),
      ]),
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed: unknown = JSON.parse(text);
    return itemExtractionSchema.parse(parsed);
  } catch (error) {
    console.error("Item extraction failed:", error);
    throw error;
  }
}

const EXPLANATION_INSTRUCTIONS = `You will be given already-computed pricing numbers for a secondhand item.
Write ONE short paragraph explaining the recommendation in this exact style:

"Recommended listing price: $575 OBO. Expected selling range: $475-$550. Quick-sale price: $425. Based on 14 comparable listings. The estimate was reduced because the item requires buyer removal and the available comparisons were active asking prices rather than confirmed sales."

Rules:
- Use ONLY the numbers given to you. Do not calculate, adjust, or invent any number.
- Mention the comp count and comp quality note given to you.
- Keep it to 2-3 sentences, plain prose, no markdown, no bullet points.
- Respond with ONLY the explanation text, nothing else.`;

/**
 * Turns already-computed numbers into a one-paragraph explanation. This is
 * the ONLY place an LLM touches pricing, and it never sees raw eBay data
 * or does arithmetic — it's handed final numbers and asked to phrase them.
 * The numbers shown in the UI always come from `computation` directly,
 * never parsed back out of this text, so even if the model's prose drifts
 * slightly it can't corrupt the actual displayed price.
 */
export async function explainPricing(
  computation: PricingComputation,
  itemContext: ItemPricingContext,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  const facts = `Item: ${itemContext.name} (${itemContext.category}, ${itemContext.condition} condition)
Recommended listing price: $${computation.recommendedPrice} ${computation.oboOrFirm === "obo" ? "OBO" : "firm"}
Expected selling range: $${computation.expectedRangeLow}-$${computation.expectedRangeHigh}
Quick-sale price: $${computation.quickSalePrice}
Comps used: ${computation.compsUsed}
Comp quality note: ${computation.compsQualityNote}
Confidence: ${computation.confidence}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: createUserContent([createPartFromText(`${EXPLANATION_INSTRUCTIONS}\n\n${facts}`)]),
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty explanation");
    }

    return text;
  } catch (error) {
    console.error("Pricing explanation generation failed:", error);
    throw error;
  }
}
