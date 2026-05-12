# Testing Rules

Clearout AI uses Vitest + React Testing Library for testing. These rules ensure consistent, maintainable tests.

## Test File Organization

- **Location:** Place tests next to the code they test
  ```
  lib/gemini.ts        → lib/gemini.test.ts
  components/item-card.tsx → components/item-card.test.tsx
  app/api/items/route.ts → app/api/items/route.test.ts
  ```

- **Naming:** `*.test.ts` or `*.test.tsx`

## Test Structure

Every test file should have this structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { extractItem } from '@/lib/gemini'

describe('extractItem', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should extract item data from a valid image', async () => {
    // Arrange
    const imageUrl = 'https://example.com/photo.jpg'
    
    // Act
    const result = await extractItem(imageUrl)
    
    // Assert
    expect(result).toHaveProperty('name')
    expect(result.condition).toBe('Good')
  })

  it('should return null for blurry images', async () => {
    // This is a different scenario — separate test
    const blurryUrl = 'https://example.com/blurry.jpg'
    const result = await extractItem(blurryUrl)
    expect(result).toBeNull()
  })
})
```

Use the **Arrange-Act-Assert** pattern:
1. **Arrange:** Set up test data
2. **Act:** Call the function
3. **Assert:** Check the result

## What to Test

### Test happy path + error cases

```typescript
it('should extract item from valid image', async () => {
  const result = await extractItem('valid.jpg')
  expect(result).toBeDefined()
})

it('should handle invalid image gracefully', async () => {
  const result = await extractItem('invalid.jpg')
  expect(result).toBeNull()
})

it('should throw if API key is missing', async () => {
  delete process.env.GEMINI_API_KEY
  expect(() => extractItem('photo.jpg')).toThrow()
})
```

### Test edge cases

```typescript
it('should handle very long item names', async () => {
  const longName = 'a'.repeat(500)
  const result = await extractItem('photo.jpg')
  expect(result.name.length).toBeLessThanOrEqual(100)
})

it('should handle special characters in names', async () => {
  const result = await extractItem('photo.jpg')
  expect(result.name).not.toMatch(/[<>]/g)
})
```

### Test data validation

```typescript
it('should validate output against schema', async () => {
  const result = await extractItem('photo.jpg')
  expect(itemCardSchema.safeParse(result).success).toBe(true)
})
```

## Mocking

Mock external services (Gemini API, Supabase):

```typescript
import { vi } from 'vitest'
import * as geminiLib from '@/lib/gemini'

describe('itemExtraction', () => {
  it('should handle API errors gracefully', async () => {
    // Mock the Gemini API to return an error
    vi.spyOn(geminiLib, 'extractItem').mockRejectedValueOnce(
      new Error('API rate limited')
    )
    
    const result = await extractItem('photo.jpg')
    expect(result.error).toContain('rate limited')
  })
})
```

For Supabase:
```typescript
import { vi } from 'vitest'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: [mockItem] }),
      select: vi.fn().mockResolvedValue({ data: [mockItem] }),
    })),
  },
}))
```

## Test Fixtures

Keep test data in a `fixtures.ts` file:

```typescript
// lib/__fixtures__/items.ts
export const mockItem = {
  id: 'item-1',
  name: 'Laptop',
  category: 'Electronics',
  condition: 'Good' as const,
  estimatedValue: 500,
}

export const mockItems = [mockItem, { ...mockItem, id: 'item-2' }]

// In your test file
import { mockItem } from '@/lib/__fixtures__/items'

it('should process item', () => {
  const result = processItem(mockItem)
  expect(result.name).toBe('Laptop')
})
```

## Coverage Targets

Aim for:
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

Critical paths (auth, AI extraction, job pipeline) should be 90%+.

Run:
```bash
npm run test -- --coverage
```

## React Component Tests

Use React Testing Library. Test behavior, not implementation:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemCard } from '@/components/item-card'

describe('ItemCard', () => {
  it('should render item details', () => {
    render(<ItemCard item={mockItem} />)
    expect(screen.getByText('Laptop')).toBeInTheDocument()
  })

  it('should call onSelect when clicked', async () => {
    const onSelect = vi.fn()
    render(<ItemCard item={mockItem} onSelect={onSelect} />)
    
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(mockItem)
  })

  it('should not render price if estimatedValue is null', () => {
    const item = { ...mockItem, estimatedValue: null }
    render(<ItemCard item={item} />)
    expect(screen.queryByText(/\$\d+/)).not.toBeInTheDocument()
  })
})
```

**Don't test:**
- Implementation details (internal state, private methods)
- Third-party libraries (don't test React itself)

**Do test:**
- User interactions (clicking, typing, submitting)
- Conditional rendering (what appears when)
- Props validation (does it break with bad props?)

## API Route Tests

Use supertest or test the handler directly:

```typescript
import { POST } from '@/app/api/items/route'
import { createItemSchema } from '@/lib/validators'

describe('POST /api/items', () => {
  it('should create item with valid input', async () => {
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

  it('should reject invalid input', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: '' }), // Invalid: empty name
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})
```

## Async Testing

Use `async/await`, not `.then()`:

```typescript
// Good
it('should fetch items', async () => {
  const result = await fetchItems()
  expect(result).toHaveLength(3)
})

// Bad
it('should fetch items', (done) => {
  fetchItems().then(result => {
    expect(result).toHaveLength(3)
    done()
  })
})
```

## Snapshot Testing

Use snapshots sparingly, only for:
- Complex UI structures that rarely change
- Error message formatting

Never snapshot:
- API responses (use value assertions instead)
- Implementation details

```typescript
// Good use of snapshot
it('should render complex form', () => {
  const { container } = render(<ComplexForm />)
  expect(container.firstChild).toMatchSnapshot()
})

// Bad use of snapshot
it('should extract item', () => {
  const result = extractItem('photo.jpg')
  expect(result).toMatchSnapshot() // ❌ Don't do this
})
```

## Running Tests

```bash
# Run all tests once
npm run test

# Run in watch mode
npm run test -- --watch

# Run specific file
npm run test lib/gemini.test.ts

# Show coverage
npm run test -- --coverage

# Update snapshots
npm run test -- -u
```

## Test Naming

Use descriptive names that read like documentation:

```typescript
// Good
it('should extract item name from photo')
it('should handle API timeouts gracefully')
it('should reject items without required fields')
it('should not allow duplicate item entries')

// Bad
it('test extraction')
it('works')
it('handles errors')
it('validates')
```

## Before Week 7 (MVP)

Focus on critical paths:
- [ ] Gemini extraction with valid/invalid inputs
- [ ] Supabase schema and CRUD operations
- [ ] Auth flow (login, logout, session)
- [ ] API routes (create, read, update item)
- [ ] Job pipeline (queue, process, error states)

Don't worry about 100% coverage yet. Focus on high-risk areas.

## Week 7+ (Polish)

Add comprehensive tests:
- [ ] Component tests for all UI elements
- [ ] Edge case handling throughout
- [ ] Performance tests for large datasets
- [ ] End-to-end flows (upload → extract → create listing)

## Summary Checklist

Before committing:
- [ ] Tests pass (`npm run test`)
- [ ] Test file colocated with source code
- [ ] At least 80% coverage on new code
- [ ] No `console.log()` calls in tests
- [ ] No `.only()` or `.skip()` left in tests
- [ ] Mocks are cleaned up after tests
- [ ] Fixture data is reusable
- [ ] Error cases are tested
- [ ] Test names describe behavior
