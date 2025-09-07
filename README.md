# TSQN - TypeScript Query Notation

A powerful, type-safe data query and manipulation library for JavaScript/TypeScript that enables declarative updates, selections, and transformations with automatic change tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Declarative Operations** - Describe what should change or be selected, not how
- 🔄 **Automatic Change Tracking** - Know exactly what changed with every update
- 📦 **Type Safe** - Full TypeScript support with intelligent type inference
- 🔍 **Advanced Predicates** - Powerful filtering with comparison, matching, and logical operators
- 🌳 **Deep Selection** - Recursively select and filter data at any depth
- ⚡ **Efficient** - Only processes actual changes
- 🔧 **Composable** - Combine multiple patterns and operators
- ↩️ **Undo Support** - Revert changes with tracked history

## Installation

```bash
npm install tsqn
```

## Quick Start

```typescript
import { update, select, DEEP_ALL, WHERE, GT, MATCH } from 'tsqn';

// Update data with automatic change tracking
const data = { user: { name: 'Alice', age: 30 } };
const changes = update(data, {
  user: { age: 31 }
});

// Select and filter data
const products = {
  electronics: {
    laptop: { name: 'MacBook', price: 1500 },
    phone: { name: 'iPhone', price: 1000 }
  },
  books: {
    fiction: { name: 'Dune', price: 20 },
    tech: { name: 'Clean Code', price: 40 }
  }
};

// Deep selection with predicates
const expensive = select(products, {
  [DEEP_ALL]: {
    [WHERE]: { price: { [GT]: 500 } },
    name: true,
    price: true
  }
});
// Result: { electronics: { laptop: { name: 'MacBook', price: 1500 }, phone: { name: 'iPhone', price: 1000 } } }
```

## Core Concepts

### 📝 Updates

Updates modify data in place while tracking all changes:

```typescript
import { update, undo, META } from 'tsqn';

const state = {
  user: { name: 'Alice', age: 30, role: 'user' },
  preferences: { theme: 'dark', notifications: true }
};

// Make updates and track changes
const changes = update(state, {
  user: { 
    age: 31,                          // Direct value
    role: (current) => 'admin',       // Function transform
  },
  preferences: { 
    theme: 'light' 
  }
});

// Inspect what changed
console.log(changes[META]);
// { 
//   user: { age: { original: 30 }, role: { original: 'user' } },
//   preferences: { theme: { original: 'dark' } }
// }

// Revert all changes
undo(state, changes);
```

### 🔍 Selection

Extract and filter data with type-safe queries:

```typescript
import { select, ALL, WHERE } from 'tsqn';

const data = {
  users: [
    { id: 1, name: 'Alice', age: 30, active: true },
    { id: 2, name: 'Bob', age: 25, active: false },
    { id: 3, name: 'Charlie', age: 35, active: true }
  ]
};

// Select specific fields from active users
const activeUsers = select(data, {
  users: {
    [ALL]: {
      [WHERE]: (user) => user.active,
      id: true,
      name: true
    }
  }
});
// Result: { users: [{ id: 1, name: 'Alice' }, { id: 3, name: 'Charlie' }] }
```

### 🔮 Predicates

Powerful filtering system with comparison and logical operators:

```typescript
import { evalPredicate, GT, LT, EQ, NEQ, MATCH, NOT, ALL, SOME } from 'tsqn';

// Comparison operators
evalPredicate(5, { [GT]: 3 });                    // true
evalPredicate(5, { [LT]: 10, [GT]: 0 });         // true (AND)
evalPredicate(5, [{ [LT]: 3 }, { [GT]: 7 }]);    // false (OR)

// String matching with regex
evalPredicate('hello@example.com', { [MATCH]: '.*@.*\\.com' });  // true
evalPredicate('admin_user', { [MATCH]: '/^admin/i' });           // true

// Null handling (EQ uses == for loose equality)
evalPredicate(null, { [EQ]: null });              // true
evalPredicate(undefined, { [EQ]: null });         // true (undefined == null)
evalPredicate(undefined, { [NOT]: null });        // true (strict inequality)

// Object predicates
const user = { name: 'Alice', age: 30, role: 'admin' };
evalPredicate(user, { 
  name: 'Alice',
  age: { [GT]: 18 },
  role: ['admin', 'moderator']  // OR - matches if any value matches
});  // true

// Array predicates
const numbers = [2, 4, 6, 8];
evalPredicate(numbers, { [ALL]: { [GT]: 0 } });   // true - all > 0
evalPredicate(numbers, { [SOME]: { [GT]: 5 } });  // true - some > 5
```

### 🌳 Deep Selection (DEEP_ALL)

Recursively search and select data at any depth:

```typescript
import { select, DEEP_ALL, WHERE, GT, MATCH } from 'tsqn';

const catalog = {
  electronics: {
    computers: {
      laptop1: { brand: 'Apple', model: 'MacBook Pro', price: 2000 },
      laptop2: { brand: 'Dell', model: 'XPS', price: 1500 }
    },
    phones: {
      phone1: { brand: 'Apple', model: 'iPhone', price: 1000 },
      phone2: { brand: 'Samsung', model: 'Galaxy', price: 800 }
    }
  },
  accessories: {
    cables: {
      usb: { brand: 'Anker', price: 20 },
      hdmi: { brand: 'Amazon', price: 15 }
    }
  }
};

// Find all Apple products at any depth
const appleProducts = select(catalog, {
  [DEEP_ALL]: {
    [WHERE]: { brand: 'Apple' },
    model: true,
    price: true
  }
});

// Find expensive items (price > 1000) and project specific fields
const expensive = select(catalog, {
  [DEEP_ALL]: {
    [WHERE]: { price: { [GT]: 1000 } },
    brand: true,
    model: true,
    price: true
  }
});

// Search for text in any field
const results = select(catalog, {
  [DEEP_ALL]: {
    [WHERE]: { [MATCH]: '/macbook/i' },
    brand: true,
    model: true
  }
});
```

**⚠️ Important**: DEEP_ALL has "fuzzy" matching behavior - it matches at ANY depth including parent objects. When using predicates like `{ [EQ]: null }` or NOT operators, consider adding additional constraints to avoid matching unintended parent objects.

## Operators Reference

### Update Operators

- **`ALL`** - Apply updates to all properties/elements
- **`WHERE`** - Conditional updates based on predicates
- **`DEFAULT`** - Initialize null/undefined fields before updating
- **`CONTEXT`** - Pass variables through update traversal
- **`META`** - Access change metadata

### Predicate Operators

- **`GT`** / **`GTE`** - Greater than / Greater than or equal
- **`LT`** / **`LTE`** - Less than / Less than or equal  
- **`EQ`** / **`NEQ`** - Equal / Not equal (uses `==` / `!=` for null handling)
- **`NOT`** - Logical NOT (strict inequality for primitives)
- **`MATCH`** - Regex pattern matching for strings
- **`ALL`** / **`SOME`** - Array/object element predicates

### Selection Operators

- **`ALL`** - Select all properties/elements
- **`WHERE`** - Filter with predicates or functions
- **`DEEP_ALL`** - Recursive selection at any depth

## Advanced Examples

### 🔐 Transactions

```typescript
import { transaction, ALL } from 'tsqn';

const gameState = {
  player: { health: 100, mana: 50 },
  enemies: [
    { id: 1, health: 50 },
    { id: 2, health: 30 }
  ]
};

const tx = transaction(gameState);

tx.update({ 
  player: { 
    health: (h) => h - 20,
    mana: (m) => m - 10
  } 
})
.update({ 
  enemies: { 
    [ALL]: { 
      health: (h) => Math.max(0, h - 25)
    } 
  } 
});

if (gameState.player.health > 0) {
  tx.commit();
} else {
  tx.revert();
}
```

### 🎯 Complex Predicates

```typescript
import { select, DEEP_ALL, WHERE, GT, LT, NOT, EQ } from 'tsqn';

const inventory = {
  warehouse1: {
    items: {
      item1: { name: 'Laptop', price: 1000, stock: 5 },
      item2: { name: 'Mouse', price: 50, stock: 100 },
      item3: { name: 'Keyboard', price: 150, stock: 0 }
    }
  }
};

// Find items with multiple conditions
const available = select(inventory, {
  [DEEP_ALL]: {
    [WHERE]: {
      price: { [LT]: 200 },
      stock: { [GT]: 0 }
    },
    name: true,
    price: true,
    stock: true
  }
});

// Exclude certain values (be specific to avoid matching parents)
const notInactive = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { 
      status: { [NOT]: ['inactive', { [EQ]: null }] },
      id: { [NOT]: undefined }  // Ensure we only match objects with an id
    },
    name: true
  }
});
```

### 🔄 Replacement vs Merge

```typescript
// Partial update (merge)
update(data, {
  user: { age: 31 }  // Only age changes, other fields remain
});

// Full replacement
update(data, {
  user: [{ age: 31, name: 'Bob' }]  // Replaces entire user object
});

// Delete optional property
update(data, {
  user: { nickname: [] }  // Removes nickname field
});
```

## TypeScript Support

TSQN provides full type safety with intelligent inference:

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
    bio: 'Developer'          // ✓ Valid (optional field)
  },
  // @ts-expect-error
  invalid: 'field'            // ✗ Type error
});

// Type-safe selection
const result = select(user, {
  name: true,
  profile: {
    bio: true
  }
});
// result type is inferred as: { name: string; profile?: { bio: string } }
```

## API Documentation

For detailed API documentation and more examples, see:
- [Predicates Guide](./docs/predicates.md) - Complete predicate system documentation
- [Selection Guide](./docs/selection.md) - Advanced selection patterns
- [Updates Guide](./docs/updates.md) - Update patterns and change tracking
- [Deep Selection Guide](./docs/deep-selection.md) - DEEP_ALL operator details
- [API Reference](./docs/api-reference.md) - Complete API documentation

## License

MIT © 2025 edtela

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.