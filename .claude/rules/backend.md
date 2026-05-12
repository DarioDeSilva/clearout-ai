# Backend & Database Rules

Clearout AI's backend is built with Next.js API routes, Supabase PostgreSQL, and async job processing. These rules ensure clean, reliable APIs and databases.

## API Route Structure

All routes follow RESTful conventions:

```
GET    /api/items              → List items
POST   /api/items              → Create item
GET    /api/items/:id          → Get one item
PATCH  /api/items/:id          → Update item
DELETE /api/items/:id          → Delete item

GET    /api/jobs/:id/status    → Check job status
POST   /api/jobs/:id/retry     → Retry failed job
```

## Route Implementation Template

```typescript
// app/api/items/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema
const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  condition: z.enum(['Like New', 'Good', 'Fair', 'Poor']),
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
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
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
    const { name, category, condition } = createItemSchema.parse(body)

    const { data, error } = await supabase
      .from('items')
      .insert([{
        user_id: session.user.id,
        name,
        category,
        condition,
      }])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/items:', error)
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
```

## Error Handling

### HTTP Status Codes

```typescript
200 // OK — request succeeded
201 // Created — new resource created
204 // No Content — success, but nothing to return
400 // Bad Request — invalid input
401 // Unauthorized — not logged in
403 // Forbidden — logged in but no permission
404 // Not Found — resource doesn't exist
409 // Conflict — duplicate, already exists
429 // Too Many Requests — rate limited
500 // Internal Server Error — server bug
503 // Service Unavailable — API down
```

### Error Response Format

Always return consistent error format:

```typescript
// Single error
return NextResponse.json(
  { error: 'Item not found' },
  { status: 404 }
)

// Multiple validation errors
return NextResponse.json(
  {
    error: 'Validation failed',
    details: [
      { field: 'name', message: 'Required' },
      { field: 'category', message: 'Must be 1-50 characters' },
    ],
  },
  { status: 400 }
)

// Server error (don't expose internals)
return NextResponse.json(
  { error: 'Something went wrong' },
  { status: 500 }
)
```

### Never Expose

Don't return:
- Stack traces
- Internal error messages
- SQL queries
- API keys or secrets
- User email addresses (if user didn't send it)

## Logging

Log everything important, but never log secrets:

```typescript
// Good logging
console.log(`Created item ${itemId} for user ${userId}`)
console.error(`Job ${jobId} failed: ${error.message}`)
console.warn(`Rate limit approaching for user ${userId}`)

// Bad logging
console.log(`Full response: ${JSON.stringify(sensitiveData)}`)
console.log(`API Key: ${process.env.GEMINI_API_KEY}`)
console.log(process.env) // Logs all secrets!
```

## Database Schema

### items table

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Fair', 'Poor')),
  
  -- Valuation
  estimated_value NUMERIC(10, 2),
  sold_price NUMERIC(10, 2), -- Only set after item is sold
  
  -- Listing
  status TEXT NOT NULL DEFAULT 'unsorted' CHECK (status IN ('keep', 'sell', 'donate', 'trash')),
  listing_title TEXT,
  listing_description TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Index for common queries
  CONSTRAINT user_items_unique UNIQUE(user_id, id)
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
```

### item_photos table

```sql
CREATE TABLE item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Storage reference
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT unique_photo UNIQUE(item_id, storage_path)
);

CREATE INDEX idx_photos_item_id ON item_photos(item_id);
```

### jobs table (for async processing)

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Job metadata
  type TEXT NOT NULL, -- 'extract_item', 'generate_listing'
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'dead')),
  
  -- Processing details
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  
  -- Input/output
  input_data JSONB, -- What was sent to the job
  output_data JSONB, -- What the job produced
  
  -- Timing
  created_at TIMESTAMP DEFAULT now(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- For debugging
  worker_id TEXT, -- Which worker processed it
  logs TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX idx_jobs_item_id ON jobs(item_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

### Enable Row Level Security

```sql
-- items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- item_photos
ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos" ON item_photos
  FOR SELECT USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own photos" ON item_photos
  FOR INSERT WITH CHECK (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

-- jobs (same RLS as items)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (
    item_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );
```

## Job Processing (Background Work)

### Job Enqueueing

When a user uploads a photo, create a job (don't process synchronously):

```typescript
// app/api/items/extract/route.ts
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await req.json()
  const { itemId, imageUrl } = body
  
  // Create job record
  const { data: job, error } = await supabase
    .from('jobs')
    .insert([{
      item_id: itemId,
      type: 'extract_item',
      status: 'queued',
      input_data: { imageUrl },
    }])
    .select()
  
  if (error) throw error
  
  return NextResponse.json({ jobId: job[0].id, status: 'queued' }, { status: 202 })
}
```

### Worker Script

```typescript
// workers/job-processor.ts
import { createClient } from '@supabase/supabase-js'
import { visionModel } from '@/lib/gemini'
import { itemCardSchema } from '@/lib/validators'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function processJob(jobId: string) {
  try {
    // Fetch job
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (!job) throw new Error(`Job ${jobId} not found`)
    
    // Mark as processing
    await supabase
      .from('jobs')
      .update({ status: 'processing', started_at: new Date() })
      .eq('id', jobId)
    
    // Process
    const { imageUrl } = job.input_data
    const response = await visionModel.generateContent([...])
    const parsed = itemCardSchema.parse(JSON.parse(response))
    
    // Update item
    await supabase
      .from('items')
      .update({
        name: parsed.name,
        category: parsed.category,
        condition: parsed.condition,
        estimated_value: parsed.estimated_value,
      })
      .eq('id', job.item_id)
    
    // Mark job complete
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        output_data: parsed,
        completed_at: new Date(),
      })
      .eq('id', jobId)
  } catch (error) {
    // Handle retry
    const { data: job } = await supabase
      .from('jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single()
    
    if (job.attempts < job.max_attempts) {
      await supabase
        .from('jobs')
        .update({
          status: 'queued',
          attempts: job.attempts + 1,
          last_error: (error as Error).message,
        })
        .eq('id', jobId)
    } else {
      await supabase
        .from('jobs')
        .update({
          status: 'dead',
          last_error: (error as Error).message,
        })
        .eq('id', jobId)
    }
  }
}
```

## Query Optimization

### Use Indexes
Supabase creates indexes automatically for foreign keys. Add manual indexes for frequently-filtered columns:

```sql
CREATE INDEX idx_items_user_status ON items(user_id, status);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC);
```

### Avoid N+1
Fetch related data in one query:

```typescript
// Bad — N+1 query
const items = await supabase.from('items').select('*')
for (const item of items) {
  const photos = await supabase.from('item_photos').select('*').eq('item_id', item.id)
}

// Good — single query
const items = await supabase.from('items').select(`
  *,
  item_photos (*)
`)
```

### Pagination
Always paginate large result sets:

```typescript
const pageSize = 20
const offset = (page - 1) * pageSize

const { data, count } = await supabase
  .from('items')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .range(offset, offset + pageSize - 1)
  .order('created_at', { ascending: false })

return {
  items: data,
  total: count,
  page,
  pageSize,
  pages: Math.ceil((count || 0) / pageSize),
}
```

## Testing

Test critical paths:

```typescript
// app/api/items/route.test.ts
import { POST } from './route'

describe('POST /api/items', () => {
  it('should create item with valid data', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Laptop',
        category: 'Electronics',
        condition: 'Good',
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data).toHaveProperty('id')
  })

  it('should reject missing required fields', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Laptop' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})
```

## Summary Checklist

Before deploying:
- [ ] All API routes return consistent error format
- [ ] Input validated with Zod
- [ ] Authentication checked on protected routes
- [ ] Database queries use RLS
- [ ] Sensitive data never logged
- [ ] Async work uses job table, not blocking
- [ ] Job failures handled with retries
- [ ] Database indexed for common queries
- [ ] Pagination implemented for large result sets
- [ ] Tests written for critical APIs
