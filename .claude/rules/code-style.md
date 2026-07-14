# Code Style Rules — Clearout AI

## TypeScript & Syntax

- **Always use TypeScript.** No `any` types unless absolutely unavoidable, and document why.
- **Use explicit types.** Don't rely on inference for function returns or complex objects.
- **Use interfaces for data shapes, types for unions.**

## Naming Conventions

- **Files:** kebab-case for components and utilities
  ```
  components/item-card.tsx
  lib/gemini-client.ts
  app/api/items/upload/route.ts
  ```

- **React components:** PascalCase
  ```typescript
  export function ItemCard() {}
  ```

- **Functions and variables:** camelCase
  ```typescript
  function extractItemData() {}
  const itemName = 'laptop'
  ```

- **Constants:** UPPER_SNAKE_CASE
  ```typescript
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  ```

## Component Structure

Order: imports → interfaces → component → hooks → logic → return

## Error Handling

Every function that can fail should handle errors explicitly:

```typescript
async function extractItem(imageUrl: string) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Item extraction failed:', error)
    throw error
  }
}
```

## API Routes

All routes should:
1. Validate input with Zod schema
2. Check authentication if needed
3. Return consistent error format
4. Include proper logging

## Formatting

- **Line length:** 100 characters
- **Indentation:** 2 spaces
- **Quotes:** Double quotes
- **Semicolons:** Always
- **Prettier:** Run `npm run format` before committing

## Comments

Write comments explaining *why*, not *what*:

```typescript
// Good — explains why
// We use the vision model directly instead of the API
// because per-request latency adds up in bulk operations

// Bad — restates the code
// Gets the item
function getItem() {}
```
