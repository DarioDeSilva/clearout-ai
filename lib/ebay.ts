const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  condition?: string;
  itemWebUrl?: string;
  shippingOptions?: { shippingCost?: { value: string } }[];
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
}

export interface RawEbayListing {
  title: string;
  price: number;
  condition: string | null;
  url: string;
  shippingCost: number | null;
}

// Application access tokens are short-lived (~2 hours) but this runs in a
// serverless function that doesn't persist state between invocations
// anyway, so there's nothing meaningful to cache — fetching a fresh token
// per request is the correct tradeoff here, not a missed optimization.
async function getAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID or EBAY_CLIENT_SECRET not set in environment");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!response.ok) {
    throw new Error(`eBay OAuth token request failed: ${response.status}`);
  }

  const data: EbayTokenResponse = await response.json();
  return data.access_token;
}

export async function searchActiveListings(query: string, limit = 50): Promise<RawEbayListing[]> {
  try {
    const accessToken = await getAccessToken();

    const url = new URL(SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    if (!response.ok) {
      throw new Error(`eBay search request failed: ${response.status}`);
    }

    const data: EbaySearchResponse = await response.json();

    return (data.itemSummaries ?? [])
      .filter((item): item is EbayItemSummary & { price: { value: string; currency: string } } =>
        Boolean(item.price?.value),
      )
      .map((item) => ({
        title: item.title,
        price: Number(item.price.value),
        condition: item.condition ?? null,
        url: item.itemWebUrl ?? "",
        shippingCost: item.shippingOptions?.[0]?.shippingCost?.value
          ? Number(item.shippingOptions[0].shippingCost.value)
          : null,
      }));
  } catch (error) {
    console.error("eBay comp search failed:", error);
    throw error;
  }
}
