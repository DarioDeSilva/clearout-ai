# Testing Rules — Clearout AI

## Test File Organization

- **Location:** Place tests next to the code they test
  ```
  lib/gemini.ts        → lib/gemini.test.ts
  components/item-card.tsx → components/item-card.test.tsx
  app/api/items/route.ts → app/api/items/route.test.ts
  ```

- **Naming:** `*.test.ts` or `*.test.tsx`

## Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { extractItem } from '@/lib/gemini'

describe('extractItem', () => {
  it('should extract item data from valid image', async () => {
    // Arrange
    const imageUrl = 'https://example.com/photo.jpg'

    // Act
    const result = await extractItem(imageUrl)

    // Assert
    expect(result).toHaveProperty('name')
    expect(result.condition).toBe('Good')
  })

  it('should handle invalid image gracefully', async () => {
    const result = await extractItem('invalid.jpg')
    expect(result).toBeNull()
  })
})
```

Use **Arrange-Act-Assert** pattern.

## What to Test

- Happy path + error cases
- Edge cases
- Data validation
- API failures

## Coverage Targets

Aim for:
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

Critical paths (auth, AI extraction, job pipeline) should be 90%+.

Run: `npm run test -- --coverage`

## Running Tests

```bash
npm run test                    # Run all tests once
npm run test -- --watch        # Watch mode
npm run test lib/gemini.test.ts # Specific file
npm run test -- --coverage     # Show coverage
```
