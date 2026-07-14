# Backend Rules — Clearout AI

## API Route Structure

```
POST   /api/projects                → Create project

POST   /api/items                   → Upload photo, create item, run AI extraction
GET    /api/items/:id               → Get one item
PATCH  /api/items/:id               → Update item fields/status
DELETE /api/items/:id               → Delete item

POST   /api/items/:id/price         → Run the pricing pipeline
POST   /api/items/:id/listing       → Generate/regenerate listing text
```

(Updated 2026-07-13 — dropped the original `/api/jobs/:id/status` polling
route. See "Jobs table" below for why.)

## Route Implementation Template

```typescript
// app/api/items/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
})

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', session.user.id)

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/items:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, category } = createItemSchema.parse(body)

    const { data, error } = await supabase
      .from('items')
      .insert([{ user_id: session.user.id, name, category }])
      .select()

    if (error) throw error
    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('POST /api/items:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## Database Schema

Full schema with RLS lives in `supabase/schema.sql` — this is the
narrative version. (Updated 2026-07-13 to add projects and the pricing
engine's tables; see `.claude/context/ARCHITECTURE.md` for the pricing
pipeline itself.)

### projects table
```
id (UUID)
user_id (FK to auth.users)
name (text)
created_at, updated_at (timestamps)
```
A default project ("My Items") is auto-created on signup so uploading a
first item never requires creating a project first.

### items table
```
id (UUID)
user_id (FK to auth.users)
project_id (FK to projects, not null)
name, category, condition (text)         -- from Gemini extraction
brand, owned_since, notes (text, nullable) -- user-confirmed optional fields
status (keep / sell / donate / trash)
listing_title (text, nullable)
listing_description (text, nullable)
created_at, updated_at (timestamps)
```

### item_photos table
```
id (UUID)
item_id (FK to items)
storage_path (text)                     -- {user_id}/{item_id}/{filename} in the item-photos bucket
created_at (timestamp)
```
One row per item in v1 (schema allows more; the upload UI enforces one
photo for now — see `docs/PRD.md`'s "Explicitly Not in MVP").

### item_pricing_preferences table
```
item_id (FK to items, primary key)      -- one row per item, relevant only when status = sell
selling_goal (quick / balanced / maximize)
urgency (text)
negotiable (bool)
obo_or_firm (obo / firm)
min_price (numeric)                     -- NEVER returned in any client-facing API response
zip_code (text)
delivery_available (bool)
removal_difficulty (text)
pickup_deadline (date)
will_hold (bool)
undetectable_defects (text)
```
`min_price` is readable by the owner (they typed it in, e.g. to re-edit
the preferences form) but must never appear in the JSON body of
`POST /api/items/:id/price`'s response — that's an application-layer
rule, not something RLS alone enforces.

### price_comps table
```
id (UUID)
item_id (FK to items)
source (text)                           -- "ebay_active" in v1; see ARCHITECTURE.md for why
query_used (text)
title, price, condition, url (from the comp listing)
fetched_at (timestamp)
```

### jobs table
```
id (UUID)
item_id (FK to items)
type (extract_item / price_estimate)
status (queued / processing / completed / failed)
attempts (int)
input_data (jsonb)
output_data (jsonb)
last_error (text, nullable)
created_at, started_at, completed_at
```
v1 runs extraction/pricing synchronously within the API route that
receives the request — no polling worker. The `jobs` table still gets a
row per run for status/attempt/error tracking and a retry button on
failure. See `ARCHITECTURE.md`'s "Why Async Jobs?" section for the
tradeoff.

## Enable RLS

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);
```

Child tables that don't have their own `user_id` column (`item_photos`,
`item_pricing_preferences`, `price_comps`, `jobs`) scope RLS through
their parent `items` row instead:

```sql
CREATE POLICY "Users can view own item photos" ON item_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_photos.item_id AND items.user_id = auth.uid())
  );
```

Same `EXISTS (...)` pattern for insert/update/delete on each child table.
Full policies are in `supabase/schema.sql`.

## Error Handling

Return consistent HTTP status codes:

```typescript
200 // OK
201 // Created
400 // Bad Request
401 // Unauthorized
403 // Forbidden
404 // Not Found
500 // Server Error
```

## Logging

Log important events but never expose internals:

```typescript
// Good
console.log(`Created item ${itemId} for user ${userId}`)
console.error(`Job ${jobId} failed: ${error.message}`)

// Bad
console.log(`Full response: ${JSON.stringify(sensitiveData)}`)
```
