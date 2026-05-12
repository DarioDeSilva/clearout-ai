# Code Style Rules

Apply these rules to all code written for Clearout AI.

## TypeScript & Syntax

- **Always use TypeScript.** No `any` types unless absolutely unavoidable, and document why.
- **Use explicit types.** Don't rely on inference for function returns or complex objects.
- **Use interfaces for data shapes, types for unions.** 
  ```typescript
  // Good
  interface Item {
    id: string
    name: string
    condition: 'Like New' | 'Good' | 'Fair' | 'Poor'
  }
  
  type ItemStatus = 'keep' | 'sell' | 'donate' | 'trash'
  
  // Bad
  const item: any = {}
  ```

- **Avoid optional properties unless necessary.** Use discriminated unions instead.
  ```typescript
  // Good
  type Item = 
    | { type: 'keep'; reason: string }
    | { type: 'sell'; listing: string }
  
  // Avoid
  interface Item {
    type?: string
    reason?: string
    listing?: string
  }
  ```

## Naming Conventions

- **Files:** kebab-case for components and utilities
  ```
  components/item-card.tsx
  lib/gemini-client.ts
  app/api/items/upload.ts
  ```

- **React components:** PascalCase
  ```typescript
  export function ItemCard() {}
  export const ItemCard = () => {}
  ```

- **Functions and variables:** camelCase
  ```typescript
  function extractItemData() {}
  const itemName = 'laptop'
  ```

- **Constants:** UPPER_SNAKE_CASE
  ```typescript
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const DEFAULT_CONDITION = 'Good'
  ```

- **API routes:** match the feature, not the HTTP verb
  ```
  app/api/items/route.ts       // GET, POST
  app/api/items/[id]/route.ts  // GET, PATCH, DELETE
  app/api/jobs/[id]/status/route.ts
  ```

## Component Structure

React components should follow this order:

```typescript
import { useState } from 'react'
import { ItemCard } from '@/components/item-card'

interface ItemListProps {
  items: Item[]
  onSelect?: (item: Item) => void
}

export function ItemList({ items, onSelect }: ItemListProps) {
  const [filter, setFilter] = useState<string>('')
  
  const filtered = items.filter(i => i.name.includes(filter))
  
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

Order: imports → interfaces → component → hooks → logic → return/render

## Error Handling

Every function that can fail should handle errors explicitly:

```typescript
// Good
async function extractItem(imageUrl: string): Promise<Result<ItemCard, Error>> {
  try {
    const response = await visionModel.generateContent([...])
    const parsed = itemCardSchema.parse(response)
    return { success: true, data: parsed }
  } catch (error) {
    return { success: false, error: new Error(`Extraction failed: ${error}`) }
  }
}

// Bad
async function extractItem(imageUrl: string) {
  const response = await visionModel.generateContent([...])
  return JSON.parse(response)
}
```

Use a Result type or throw meaningful errors. Never silently fail.

## API Routes

All API routes should:
1. Validate input with Zod schema
2. Check authentication if needed
3. Return consistent error format
4. Include proper logging

```typescript
// app/api/items/route.ts
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const createItemSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  condition: z.enum(['Like New', 'Good', 'Fair', 'Poor']),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, category, condition } = createItemSchema.parse(body)
    
    const { data, error } = await supabase
      .from('items')
      .insert([{ name, category, condition }])
      .select()
    
    if (error) throw error
    
    return Response.json(data[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/items:', error)
    return Response.json(
      { error: 'Failed to create item' },
      { status: 400 }
    )
  }
}
```

## Imports

Group imports in this order:
1. External libraries
2. Next.js/React
3. Internal components
4. Internal utilities/types
5. Styles (at the end)

```typescript
import { useState, useEffect } from 'react'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { ItemCard } from '@/components/item-card'
import { extractItemData } from '@/lib/gemini'
import type { Item } from '@/types'
import styles from './dashboard.module.css'
```

## Comments

- Write comments explaining *why*, not *what*
- Use JSDoc for exported functions
- Keep comments up-to-date when you refactor

```typescript
// Good
/**
 * Extract item metadata from a photo using Gemini Vision.
 * Returns null if the image is too blurry or unrecognizable.
 */
export async function extractItem(imageUrl: string): Promise<ItemCard | null> {
  // We use the vision model directly instead of going through the API
  // because the API has per-request latency that adds up in bulk operations
  const result = await visionModel.generateContent([...])
}

// Bad
// Gets the item
function getItem() {
  // ...
}
```

## Formatting

- **Line length:** 100 characters (enforced by Prettier)
- **Indentation:** 2 spaces
- **Quotes:** Double quotes for strings
- **Semicolons:** Always (enforced by ESLint)
- **Trailing commas:** Yes in multiline objects/arrays

Prettier and ESLint handle this automatically. Run:
```bash
npm run lint
npm run format
```

## Null/Undefined Handling

Prefer explicit null checking over optional chaining when the value matters:

```typescript
// Good — explicit about what happens if null
if (item === null) {
  return { error: 'Item not found' }
}

// Also good — for defensive coding in chains
const price = item?.estimatedValue ?? 0

// Bad — ignores the null silently
const price = item?.estimatedValue
```

## Environment Variables

- All env vars start with `NEXT_PUBLIC_` if they're client-side
- Check they exist at runtime, don't assume:
  ```typescript
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  ```
- Never log env values
- Use `.env.example` for documentation

## Summary Checklist

Before committing code:
- [ ] No `any` types (unless documented)
- [ ] Explicit error handling
- [ ] Input validation with Zod
- [ ] Proper TypeScript types
- [ ] Comments explain *why*, not *what*
- [ ] Files follow kebab-case naming
- [ ] Functions follow camelCase naming
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatted (`npm run format`)
