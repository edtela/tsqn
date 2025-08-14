# TSQN - TypeScript Query Notation

A powerful, type-safe data update system for JavaScript/TypeScript that enables declarative updates with automatic change tracking.

## Features

- 🎯 **Declarative Updates** - Describe what should change, not how
- 🔄 **Automatic Change Tracking** - Know exactly what changed with every update
- 📦 **Type Safe** - Full TypeScript support with intelligent type inference
- ⚡ **Efficient** - Only processes actual changes
- 🔧 **Composable** - Combine multiple update patterns
- ↩️ **Undo Support** - Revert changes with tracked history

## Installation

```bash
npm install tsqn
```

## Quick Start

```typescript
import { update, undoUpdate, META } from 'tsqn';

// Simple property update
const data = {
  user: { name: 'Alice', age: 30 },
  settings: { theme: 'dark' }
};

const changes = update(data, {
  user: { age: 31 },
  settings: { theme: 'light' }
});

console.log(data.user.age); // 31
console.log(changes); // Contains change history with original values

// Undo the changes
undoUpdate(data, changes);
console.log(data.user.age); // 30
```

## Core Concepts

### Update Statements

An update statement describes how to transform data:

```typescript
const changes = update(data, {
  user: {
    name: 'Bob',                              // Direct value
    score: (current) => current + 10,         // Function transform
    profile: {
      bio: 'Updated bio'                      // Nested update
    }
  }
});
```

### Operators

#### ALL - Bulk Updates

Apply the same update to all properties:

```typescript
update(data, {
  products: {
    [ALL]: { inStock: true }  // Set all products to in stock
  }
});
```

#### WHERE - Conditional Updates

Apply updates only when a condition is met:

```typescript
update(data, {
  users: {
    [ALL]: {
      [WHERE]: (user) => user.age >= 65,
      category: 'senior'
    }
  }
});
```

#### DEFAULT - Null Field Initialization

Initialize null fields before applying updates:

```typescript
update(data, {
  user: {
    profile: {
      [DEFAULT]: { name: '', bio: '' },  // Initialize if null
      name: 'Alice'
    }
  }
});
```

#### CONTEXT - Variable Passing

Pass variables through the update traversal:

```typescript
update(data, {
  [CONTEXT]: { taxRate: 0.08 },
  items: {
    [ALL]: {
      finalPrice: (price, item, key, ctx) => 
        price * (1 + ctx.taxRate)
    }
  }
});
```

### Replacement vs Partial Updates

Use `[]` syntax to replace entire values:

```typescript
// Partial update (merge)
update(data, {
  user: { age: 31 }  // Only age changes
});

// Full replacement
update(data, {
  user: [{ age: 31 }]  // Replaces entire user object
});

// Delete optional property
update(data, {
  user: { nickname: [] }  // Removes nickname field
});
```

## Change Tracking

Every update returns a change object with original values:

```typescript
const changes = update(data, {
  user: { name: 'Bob' }
});

// changes structure:
{
  user: {
    name: 'Bob',
    [META]: {
      name: { original: 'Alice' }
    }
  }
}
```

## Change Detection

Check if specific changes occurred:

```typescript
import { hasChanges, anyChange, typeChange } from 'tsqn';

const hasUserChanges = hasChanges(changes, {
  user: {
    name: anyChange,      // Any change to name
    age: typeChange       // Type changed (e.g., string to number)
  }
});
```

## Selection

Extract partial data with type-safe selection queries:

```typescript
import { select, ALL, WHERE } from 'tsqn';

// Basic object selection
const user = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
  profile: {
    bio: 'Developer',
    location: 'NYC'
  }
};

const basicSelect = select(user, {
  name: true,
  profile: {
    bio: true
  }
});
// Result: { name: 'Alice', profile: { bio: 'Developer' } }

// Array selection with ALL
const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 }
];

const allUsers = select(users, {
  [ALL]: {
    id: true,
    name: true
  }
});
// Result: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Charlie' }]

// Filtering with WHERE
const items = [
  { id: 1, name: 'Apple', price: 3 },
  { id: 2, name: 'Banana', price: 7 },
  { id: 3, name: 'Orange', price: 5 }
];

const expensiveItems = select(items, {
  [ALL]: {
    [WHERE]: (item) => item.price > 5,
    name: true,
    price: true
  }
});
// Result: [{ name: 'Banana', price: 7 }]

// Sparse array selection (preserves indices)
const data = ['a', 'b', 'c', 'd'];
const sparseSelect = select(data, {
  '0': true,
  '2': true
});
// Result: ['a', undefined, 'c']

// Works with Record types
const userMap: Record<string, User> = {
  'user123': { name: 'Alice', age: 30 },
  'user456': { name: 'Bob', age: 25 }
};

const selectedUsers = select(userMap, {
  'user123': { name: true },
  'user456': { age: true }
});
// Result: { 'user123': { name: 'Alice' }, 'user456': { age: 25 } }
```

## API Reference

### Core Functions

- `update<T>(data: T, statement: Update<T>, changes?: UpdateResult<T>): UpdateResult<T> | undefined`
- `undoUpdate<T>(data: T, changes: UpdateResult<T>): void`
- `select<T>(data: T, statement: Select<T>): SelectResult<T> | undefined`
- `hasChanges<T>(result: UpdateResult<T>, detector: ChangeDetector<T>): boolean`

### Symbols

- `ALL` - Apply to all properties
- `WHERE` - Conditional filter
- `DEFAULT` - Default value for null fields
- `CONTEXT` - Context variables
- `META` - Change metadata

### Change Detectors

- `anyChange` - Detects any change
- `typeChange` - Detects type changes

## TypeScript Support

TSQN is built with TypeScript and provides full type safety:

```typescript
interface User {
  name: string;
  age: number;
  profile?: {
    bio: string;
    avatar?: string;
  };
}

const user: User = { name: 'Alice', age: 30 };

// Type-safe updates
update(user, {
  age: 31,                    // ✓ Valid
  profile: {
    bio: 'Developer'          // ✓ Valid
  },
  // @ts-expect-error
  invalid: 'field'            // ✗ Type error
});
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.