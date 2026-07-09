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

## Why Async Jobs?

If we called Gemini synchronously:
- User waits 1-5 seconds per photo
- If API fails, entire request fails
- No retry mechanism

With async jobs:
- Item appears immediately
- AI processes in background
- Automatic retries on failure
- User never sees loading screen

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
   - Solution: Job table with status tracking

3. **User Data Privacy:** Ensure users can't see each other's items
   - Solution: Row Level Security (RLS) at database level

4. **Slow AI Processing:** Don't block user request
   - Solution: Async job queue + polling
