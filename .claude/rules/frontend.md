# Frontend Rules

Clearout AI's UI is built with React, TypeScript, and Tailwind CSS. These rules ensure consistent, maintainable components.

## Component Structure

### Naming & Organization

```
components/
├── items/
│   ├── item-card.tsx
│   ├── item-form.tsx
│   └── item-list.tsx
├── auth/
│   ├── login-form.tsx
│   └── signup-form.tsx
├── common/
│   ├── button.tsx
│   ├── input.tsx
│   └── modal.tsx
└── layout/
    ├── header.tsx
    ├── sidebar.tsx
    └── footer.tsx
```

- Group related components in folders
- Name files after the component (PascalCase)
- Prefer small, focused components over large ones

### Component Template

```typescript
import { ReactNode } from 'react'
import Button from '@/components/button'
import type { Item } from '@/types'

interface ItemCardProps {
  item: Item
  onSelect?: (item: Item) => void
  isSelected?: boolean
}

export function ItemCard({
  item,
  onSelect,
  isSelected = false,
}: ItemCardProps) {
  const handleClick = () => {
    onSelect?.(item)
  }

  return (
    <button
      onClick={handleClick}
      className={`p-4 border rounded-lg ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-gray-600">{item.category}</p>
    </button>
  )
}
```

**Order:**
1. Imports
2. Type definitions (interfaces)
3. Component function
4. Exports

## State Management

### Local State (useState)
Use for UI-only state (open/closed, hover, focus):

```typescript
const [isOpen, setIsOpen] = useState(false)
const [selectedItems, setSelectedItems] = useState<string[]>([])
```

### Server State (useEffect + fetch or Supabase)
Fetch data on mount or when dependencies change:

```typescript
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
      
      if (error) throw error
      setItems(data)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  fetchItems()
}, []) // Only run once on mount
```

### Global State (Context)
Use React Context only for truly global state (auth, theme):

```typescript
// contexts/auth.tsx
import { createContext, useContext, ReactNode, useState } from 'react'

interface AuthContextType {
  userId: string | null
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)

  const logout = () => setUserId(null)

  return (
    <AuthContext.Provider value={{ userId, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

Don't use Context for frequently-changing state (forms, lists). Use local state instead.

## Forms

### Form Validation
Use React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z.string().min(1, 'Category required'),
  condition: z.enum(['Like New', 'Good', 'Fair', 'Poor']),
})

type CreateItemInput = z.infer<typeof createItemSchema>

export function ItemForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
  })

  const onSubmit = async (data: CreateItemInput) => {
    const response = await fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create item')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="Item name" />
      {errors.name && <span className="text-red-600">{errors.name.message}</span>}
      
      <button type="submit">Create</button>
    </form>
  )
}
```

### Form Error Handling
Always show validation errors and server errors:

```typescript
const [serverError, setServerError] = useState<string | null>(null)

const onSubmit = async (data: CreateItemInput) => {
  try {
    setServerError(null)
    const response = await fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      setServerError(error.message || 'Failed to create item')
      return
    }
  } catch (error) {
    setServerError((error as Error).message)
  }
}

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {/* form fields */}
    {serverError && (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
        {serverError}
      </div>
    )}
  </form>
)
```

## Styling with Tailwind

### Class Organization
Group classes logically:

```tsx
<div className="
  // Layout
  flex items-center justify-between gap-4
  // Sizing
  w-full p-4
  // Colors
  bg-white border border-gray-200
  // Effects
  rounded-lg shadow-sm hover:shadow-md
  // Transitions
  transition-shadow duration-200
"
>
```

### Responsive Design
Mobile-first, then add breakpoints:

```tsx
<div className="
  // Mobile (default)
  grid grid-cols-1 gap-4
  // Tablet
  md:grid-cols-2
  // Desktop
  lg:grid-cols-3
"
>
```

### Dark Mode (if needed)
Use `dark:` prefix:

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
```

**Don't over-style.** Tailwind is for layout and basic styling. Keep it simple.

## Performance

### Memoization
Only memoize if a component re-renders frequently with same props:

```typescript
import { memo } from 'react'

interface ItemCardProps {
  item: Item
  onClick: (item: Item) => void
}

// Only memoize if ItemCard is re-rendered often
export const ItemCard = memo(function ItemCard({ item, onClick }: ItemCardProps) {
  return <button onClick={() => onClick(item)}>{item.name}</button>
}, (prev, next) => {
  // Return true if props are equal (skip re-render)
  return prev.item.id === next.item.id && prev.onClick === next.onClick
})
```

**Don't over-memoize.** Most components don't need it.

### Lazy Loading
Load heavy components only when needed:

```typescript
import { lazy, Suspense } from 'react'

const ItemForm = lazy(() => import('@/components/item-form'))

export function Dashboard() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <button onClick={() => setShowForm(true)}>Add Item</button>
      
      {showForm && (
        <Suspense fallback={<div>Loading...</div>}>
          <ItemForm />
        </Suspense>
      )}
    </>
  )
}
```

### Image Optimization
Always use Next.js `Image` component:

```typescript
import Image from 'next/image'

export function ItemPhoto({ url, alt }: { url: string; alt: string }) {
  return (
    <Image
      src={url}
      alt={alt}
      width={400}
      height={300}
      priority={false}
      loading="lazy"
      className="rounded-lg"
    />
  )
}
```

## Accessibility

### Semantic HTML
Use proper HTML elements:

```tsx
// Good
<button onClick={handleClick}>Save</button>
<input type="email" placeholder="Email" />
<nav>{/* navigation links */}</nav>

// Bad
<div onClick={handleClick} className="cursor-pointer">Save</div>
<div className="input" contentEditable>Email</div>
```

### ARIA Labels
Add labels for screen readers:

```tsx
<button aria-label="Close menu" onClick={closeMenu}>✕</button>

<form>
  <label htmlFor="item-name">Item name</label>
  <input id="item-name" type="text" />
</form>
```

### Focus Management
Keyboard users should be able to tab through your app:

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500">
  Submit
</button>
```

## Loading & Error States

Always handle three states:

```typescript
export function ItemsList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  if (loading) return <div>Loading items...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  if (items.length === 0) return <div>No items yet</div>

  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

## Navigation

### Next.js Router
Use Next.js `useRouter` for client-side navigation:

```typescript
import { useRouter } from 'next/navigation'

export function ItemCard({ item }: { item: Item }) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/items/${item.id}`)
  }

  return <button onClick={handleClick}>{item.name}</button>
}
```

### Links
Use `<Link>` for static routes:

```tsx
import Link from 'next/link'

export function Navigation() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/items">Items</Link>
    </nav>
  )
}
```

## Summary Checklist

Before pushing frontend code:
- [ ] Components are small and focused
- [ ] Props are typed with TypeScript
- [ ] Forms use React Hook Form + Zod
- [ ] Loading and error states handled
- [ ] Responsive design tested on mobile
- [ ] Accessibility labels added (aria-label, htmlFor)
- [ ] No console errors or warnings
- [ ] Images use Next.js `Image` component
- [ ] No inline styles (use Tailwind)
- [ ] Component tests written
