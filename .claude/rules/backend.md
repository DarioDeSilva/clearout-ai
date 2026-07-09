# Backend Rules — Clearout AI

## API Route Structure

```
GET    /api/items              → List items
POST   /api/items              → Create item
GET    /api/items/:id          → Get one item
PATCH  /api/items/:id          → Update item
DELETE /api/items/:id          → Delete item

GET    /api/jobs/:id/status    → Check job status
```

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

### items table
```
id (UUID)
user_id (FK to auth.users)
name (text)
category (text)
condition (Like New / Good / Fair / Poor)
estimated_value (numeric)
status (keep / sell / donate / trash)
listing_title (text, nullable)
listing_description (text, nullable)
created_at, updated_at (timestamps)
```

### jobs table
```
id (UUID)
item_id (FK to items)
type (extract_item)
status (queued / processing / completed / failed)
attempts (int)
input_data (jsonb)
output_data (jsonb)
last_error (text, nullable)
created_at, started_at, completed_at
```

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
