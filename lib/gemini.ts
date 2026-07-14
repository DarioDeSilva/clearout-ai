import { GoogleGenAI, createUserContent, createPartFromBase64, createPartFromText } from "@google/genai";
import { itemExtractionSchema, type ItemExtraction } from "@/lib/validators";

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
