# Security Rules

Clearout AI handles user data and integrates with external APIs. These rules protect against common vulnerabilities.

## Environment Variables

**Never commit secrets.** All sensitive data goes in `.env.local`, which is in `.gitignore`.

### Public vs. Private

```typescript
// Public variables — visible in browser, OK to expose
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

// Private variables — server-side only, never expose to client
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSyA...
```

**In your code:**
```typescript
// Good — service role key only used on server
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
)

// Bad — trying to use secret in client code
export const apiKey = process.env.GEMINI_API_KEY // ❌ Will be undefined in browser
```

Check at runtime:
```typescript
// At app startup or in functions
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not set in environment')
}
```

## API Keys & Tokens

### Gemini API Key
- Used only in server-side code (`app/api/` or `lib/` functions called from server)
- Never expose in API responses
- Rotate it if you suspect it's been leaked

```typescript
// ✅ Good — server-side only
async function extractItem(imageUrl: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return await visionModel.generateContent([...])
}

// ❌ Bad — returns API key to client
app.get('/api/config', (req, res) => {
  res.json({ geminiKey: process.env.GEMINI_API_KEY })
})
```

### Supabase Keys
- **Anon key:** OK to expose (in `NEXT_PUBLIC_*`), but restricted with RLS
- **Service role key:** Never expose, server-side only
- Always use Anon key for client-side queries
- Use Service role key for admin operations

```typescript
// Client-side — use anon key
const { data } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', user.id) // RLS enforces this

// Server-side admin — use service role key
const adminSupabase = createClient(url, serviceRoleKey)
const { data } = await adminSupabase
  .from('items')
  .select('*') // Bypasses RLS
```

## Authentication

### Session Management
- Use Supabase Auth (built-in, secure)
- Store session in HTTP-only cookies (Next.js handles this)
- Never store secrets in localStorage
- Validate session on every protected route

```typescript
// app/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req: Request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
}
```

### Password Requirements
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers
- Supabase enforces this by default — don't weaken it

### API Authentication
Every protected endpoint checks auth:

```typescript
// app/api/items/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = session.user.id
  // Now process request as this user
}
```

## Database Security

### Row Level Security (RLS)

**Enable RLS on every table.** Supabase disables it by default — you must enable it.

```sql
-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own items
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own items
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own items
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own items
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);
```

**Test RLS:**
```typescript
it('should not allow user to see another user\'s items', async () => {
  const { data } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', 'different-user-id')
  
  // With RLS, this returns empty even if items exist
  expect(data).toEqual([])
})
```

### Sensitive Columns
Don't store:
- Passwords (use Supabase Auth)
- Credit cards (never)
- API keys
- Personal government IDs

Store only what you need:
```typescript
// items table
- id (uuid)
- user_id (uuid, FK to auth.users)
- name (text)
- category (text)
- condition (text)
- estimated_value (numeric)
- status (text) — keep, sell, donate, trash
- created_at (timestamp)
- updated_at (timestamp)
```

## API Security

### Input Validation
Always validate and sanitize input:

```typescript
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  condition: z.enum(['Like New', 'Good', 'Fair', 'Poor']),
})

export async function POST(req: Request) {
  const body = await req.json()
  
  try {
    const { name, category, condition } = createItemSchema.parse(body)
    // Safe to use now
  } catch (error) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }
}
```

### SQL Injection Prevention
Never concatenate strings into queries:

```typescript
// ❌ Bad — SQL injection possible
const { data } = await supabase.from('items').select(`*`)
  .filter(`name`, 'ilike', `%${userInput}%`)

// ✅ Good — parameterized (Supabase uses this by default)
const { data } = await supabase
  .from('items')
  .select('*')
  .ilike('name', `%${userInput}%`)
```

### Rate Limiting
Protect endpoints from abuse:

```typescript
// Simple in-memory rate limiter (use Redis for production)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, maxRequests = 100, windowMs = 60000) {
  const now = Date.now()
  const record = requestCounts.get(ip)
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) return false
  record.count++
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  
  if (!rateLimit(ip)) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  // Process request
}
```

## File Uploads

### Image Upload Security
Users upload photos of items. Protect against abuse:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('image') as File
  
  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: 'File too large' },
      { status: 413 }
    )
  }
  
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: 'Invalid file type' },
      { status: 400 }
    )
  }
  
  // Generate unique filename (don't trust user's filename)
  const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('item-photos')
    .upload(`${userId}/${filename}`, file)
  
  if (error) throw error
  return Response.json({ url: data.path })
}
```

### Storage Security
In Supabase Storage, set bucket policies:

```sql
-- Users can only upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

## Third-Party APIs

### Gemini API Security
- Never log the full API response if it contains user data
- Don't expose raw API errors to clients
- Handle rate limits gracefully

```typescript
async function extractItem(imageUrl: string) {
  try {
    const result = await visionModel.generateContent([...])
    // Don't log result if it might contain sensitive data
    return validateAndReturn(result)
  } catch (error) {
    // Log error internally, but don't expose to client
    console.error('Gemini API error:', error.code)
    
    if (error.code === 'RESOURCE_EXHAUSTED') {
      return { error: 'Service temporarily unavailable' }
    }
    
    return { error: 'Failed to extract item' }
  }
}
```

## Logging

### What to Log
- User actions (login, logout, upload)
- API errors (but not sensitive data)
- Job processing events
- Security events (failed auth, suspicious activity)

### What NOT to Log
- Passwords or secrets
- API keys
- Full request/response bodies with user data
- Personal information (emails, IDs) unnecessarily

```typescript
// Good logging
console.log(`User ${userId} uploaded image ${fileId}`)
console.error(`Job ${jobId} failed: ${error.message}`)

// Bad logging
console.log(`API Key: ${process.env.GEMINI_API_KEY}`)
console.log(`Full response: ${JSON.stringify(sensitiveData)}`)
```

## CORS & Origins

Only allow requests from your app:

```typescript
// middleware.ts or API route
const allowedOrigins = [
  'http://localhost:3000',
  'https://clearout-ai.vercel.app',
]

const origin = req.headers.get('origin')
if (allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin)
}
```

## Security Checklist

Before deploying:
- [ ] All secrets in `.env.local`, not in code
- [ ] RLS enabled on all Supabase tables
- [ ] API routes validate input with Zod
- [ ] Protected routes check authentication
- [ ] No sensitive data in logs
- [ ] File uploads validated for size and type
- [ ] CORS restricted to your domain
- [ ] Session management uses HTTP-only cookies
- [ ] Error messages don't leak internal details
- [ ] API keys rotated if ever exposed

## If You Suspect a Breach

1. Stop using the compromised key immediately
2. Generate a new key in the service dashboard
3. Update `.env.local` and redeploy
4. Check logs for unauthorized access
5. Notify users if their data was accessed

Never try to "clean up" a leaked key — generate a new one.
