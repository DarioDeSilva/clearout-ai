# Security Rules — Clearout AI

## Environment Variables

**Never commit secrets.** All sensitive data goes in `.env.local`, which is in `.gitignore`.

### Public vs. Private

```typescript
// Public variables — visible in browser, OK to expose
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

// Private variables — server-side only, never expose
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSyA...
```

Check at runtime:
```typescript
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not set in environment')
}
```

## API Keys

### Gemini API Key
- Used only in server-side code
- Never expose in API responses
- Rotate if suspected leak

### Supabase Keys
- **Anon key:** OK to expose (in `NEXT_PUBLIC_*`), but restricted with RLS
- **Service role key:** Never expose, server-side only

## Authentication

### Session Management
- Use Supabase Auth (built-in, secure)
- Store session in HTTP-only cookies
- Never store secrets in localStorage
- Validate session on every protected route

### Protected Routes

```typescript
export async function POST(req: Request) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Process request as authenticated user
}
```

Use `getUser()`, not `getSession()`, on the server. `getSession()` just
reads whatever's in the cookie without checking it's still valid;
`getUser()` re-validates the token against Supabase's Auth server. On the
server, where the cookie could in principle be tampered with, that
difference matters. (Corrected 2026-07-13 — the app's actual auth code in
`app/dashboard/layout.tsx` uses `getUser()`.)

## Row Level Security (RLS)

**Enable RLS on every table.** This ensures users can only see their own data at the database level.

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Input Validation

Always validate and sanitize input:

```typescript
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
})

const { name, category } = createItemSchema.parse(body)
// Safe to use now
```

## File Uploads

Validate size and type:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

if (file.size > MAX_FILE_SIZE) {
  return Response.json({ error: 'File too large' }, { status: 413 })
}

if (!ALLOWED_TYPES.includes(file.type)) {
  return Response.json({ error: 'Invalid file type' }, { status: 400 })
}
```

## Logging

### What to Log
- User actions (login, logout, upload)
- API errors (but not sensitive data)
- Job processing events

### What NOT to Log
- Passwords or secrets
- API keys
- Full request/response bodies
- Personal information unnecessarily

## Checklist Before Deploying

- [ ] All secrets in `.env.local`, not in code
- [ ] RLS enabled on all Supabase tables
- [ ] API routes validate input with Zod
- [ ] Protected routes check authentication
- [ ] No sensitive data in logs
- [ ] File uploads validated for size and type
