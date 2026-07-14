# Clearout AI Architecture

## System Diagram

```
User Browser (React)
    ↓ (upload photo)
Next.js API Route
    ↓ (save photo + create job)
Supabase Database
    ↓ (job sits in queue)
Background Worker
    ↓ (fetch photo, call Gemini)
Gemini Vision API
    ↓ (return item data)
Database updated
    ↓ (job marked complete)
Frontend polls
    ↓ (item card updates)
User sees result
```

## Why Async Jobs? (and why v1 doesn't actually do this)

If we called Gemini synchronously:
- User waits 1-5 seconds per photo
- If API fails, entire request fails
- No retry mechanism

With async jobs:
- Item appears immediately
- AI processes in background
- Automatic retries on failure
- User never sees loading screen

**v1 reality (updated 2026-07-13):** a real polling background worker
needs infrastructure Vercel's serverless model doesn't give you for free
— a queue, a cron, or an Edge Function. Rather than build that before
proving the core loop works, v1's API routes (`POST /api/items`,
`POST /api/items/:id/price`) do the Gemini/pricing work synchronously and
return the result in the same response — the 1-5 second wait is
tolerable for a single upload. The `jobs` table still gets a row per run
for status/attempt/error tracking and a retry button on failure, so the
observability benefit of the job pattern is kept without needing a
poller. Real background/batch processing (e.g. uploading 20 photos at
once) is where this diagram's original design would actually get built —
that's deferred until the core loop is proven and bulk upload becomes a
real feature, not a v1 requirement.

## Pricing Engine — Data Sources and Pipeline

Added 2026-07-13. Pricing is a first-class subsystem, not a field Gemini
guesses from a photo.

**Data source reality, load-bearing for the whole design:** Facebook
Marketplace has no public API at all (active or sold), and scraping it
violates their ToS — hard excluded as a data source. Craigslist has no
API and its ToS prohibits automated access — same hard exclude. eBay's
Browse API is free and self-serve but only returns active (asking-price)
listings; real sold/completed price data lives behind eBay's Marketplace
Insights API, which requires applying for and being approved as an eBay
partner — not realistic for v1. **The only real external comp data
available in v1 is eBay active listings**, used with an explicit
conservative markdown because they're asking prices, not confirmed sales.

**Pipeline** (deterministic backend code — the LLM never invents the
final number):

1. Gemini Vision extracts item identity (type/brand/model/size/
   material/visible condition) from the photo.
2. User confirms/fills optional fields (age, defects, accessories,
   original price, working status).
3. User fills seller preferences (selling goal, urgency, negotiable,
   OBO/firm, private minimum, zip, pickup/delivery, removal difficulty,
   deadline, hold-item, undetectable defects) — only relevant once
   status = sell.
4. Pricing service (plain code): builds a query from item identity,
   queries eBay Browse API, filters irrelevant results (new/parts-only/
   bundles/wrong-size/outlier-shipping), computes median + IQR after
   trimming outliers, applies the active-listing markdown and
   category-specific depreciation multipliers, applies the seller-strategy
   transform (quick-sale/balanced/maximize, OBO/firm), enforces the
   private minimum as a server-side-only floor, and computes a confidence
   score capped at "medium" since there's no sold-comp data in v1.
5. An LLM call phrases the already-computed numbers into a one-sentence
   explanation. It's handed numbers, not asked to generate them.

**Explicitly blocked without a partnership, not just deferred:** Facebook
Marketplace or Craigslist comp data. **Deferred until there's traction to
point to:** eBay Marketplace Insights (sold comps). **Deferred until
there are real sold items:** ClearoutAI's own outcome-data flywheel
(`sale_outcomes` table — final price, days to sell, etc. — feeding back
into pricing accuracy over time).

## Database Schema

Key tables:
- `items` — household items
- `item_photos` — where photos are stored
- `jobs` — background processing queue

All have RLS policies so users only see their own data.

## Key Technical Challenges

1. **Gemini Vision API:** Returns JSON that might be invalid
   - Solution: Zod validation + retry logic

2. **Background Jobs:** Need to track state and retry failures
   - Solution: Job table with status tracking, run synchronously in v1
     (see "Why Async Jobs?" above)

3. **User Data Privacy:** Ensure users can't see each other's items
   - Solution: Row Level Security (RLS) at database level

4. **Slow AI Processing:** Don't block user request
   - Solution: accepted as a tolerable synchronous wait in v1 (1-5
     seconds); real async queueing is deferred until bulk upload exists

5. **Comp-grounded pricing without real APIs for most platforms**
   - Solution: eBay Browse API active listings + rules-based adjustments,
     honestly labeled "medium" confidence at best — see "Pricing Engine"
     above
