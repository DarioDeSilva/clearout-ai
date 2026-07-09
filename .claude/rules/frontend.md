# Frontend Rules — Clearout AI

## Component Structure

```
components/
├── items/
│   ├── item-card.tsx
│   ├── item-form.tsx
│   └── item-list.tsx
├── auth/
│   ├── login-form.tsx
│   └── signup-form.tsx
└── common/
    ├── button.tsx
    └── input.tsx
```

## Component Template

```typescript
import { ReactNode } from 'react'
import { Button } from '@/components/button'
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
      className={isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
    >
      <h3>{item.name}</h3>
      <p>{item.category}</p>
    </button>
  )
}
```

## State Management

### Local State (useState)
Use for UI-only state (open/closed, hover, focus):

```typescript
const [isOpen, setIsOpen] = useState(false)
const [selectedItems, setSelectedItems] = useState<string[]>([])
```

### Server State (useEffect + fetch)
Fetch data on mount:

```typescript
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items')
      const data = await res.json()
      setItems(data)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  fetchItems()
}, [])
```

## Forms

Use React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createItemSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z.string().min(1, 'Category required'),
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
    if (!response.ok) throw new Error('Failed')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="Item name" />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Create</button>
    </form>
  )
}
```

## Styling with Tailwind

- Use Tailwind utility classes
- Keep inline styles to a minimum
- Mobile-first responsive design

## Loading & Error States

Always handle three states:

```typescript
if (loading) return <div>Loading...</div>
if (error) return <div>Error: {error}</div>
if (items.length === 0) return <div>No items yet</div>

return <div>{/* render items */}</div>
```

## Accessibility

- Use semantic HTML (`<button>`, `<input>`, `<form>`)
- Add labels: `<label htmlFor="item-name">Name</label>`
- Use ARIA when needed: `aria-label="Close menu"`
