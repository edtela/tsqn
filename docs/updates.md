# Updates Guide

TSQN's update system provides powerful, type-safe data mutations with automatic change tracking.

## Table of Contents
- [Basic Updates](#basic-updates)
- [Function Transforms](#function-transforms)
- [Change Tracking](#change-tracking)
- [Operators](#operators)
- [Replacement vs Merge](#replacement-vs-merge)
- [Transactions](#transactions)
- [Undo/Redo](#undoredo)
- [Advanced Patterns](#advanced-patterns)

## Basic Updates

### Simple Property Updates

```typescript
import { update } from 'tsqn';

const user = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
};

// Direct value updates
const changes = update(user, {
  age: 31,
  email: 'alice.smith@example.com'
});

console.log(user);
// { name: 'Alice', age: 31, email: 'alice.smith@example.com' }
```

### Nested Updates

```typescript
const state = {
  user: {
    profile: {
      name: 'Alice',
      bio: 'Developer',
      settings: {
        theme: 'dark',
        notifications: true
      }
    }
  }
};

// Update nested properties
update(state, {
  user: {
    profile: {
      bio: 'Senior Developer',
      settings: {
        theme: 'light'
      }
    }
  }
});
```

## Function Transforms

Transform values based on their current state:

```typescript
const data = {
  counter: 5,
  score: 100,
  multiplier: 2
};

// Function transforms receive current value
update(data, {
  counter: (current) => current + 1,
  score: (current) => current * 2,
  multiplier: (m) => m * m
});
// Result: { counter: 6, score: 200, multiplier: 4 }

// Functions receive multiple parameters
update(data, {
  score: (value, item, key, context) => {
    console.log(value);    // 200 (current value)
    console.log(item);     // The parent object
    console.log(key);      // 'score'
    console.log(context);  // Context object if provided
    return value + 50;
  }
});
```

## Change Tracking

Every update returns a change object with metadata:

```typescript
import { update, META } from 'tsqn';

const user = { name: 'Alice', age: 30 };

const changes = update(user, {
  age: 31,
  name: 'Alice Smith'
});

// Access change metadata
console.log(changes[META]);
// {
//   age: { original: 30 },
//   name: { original: 'Alice' }
// }

// Check what changed
if (changes) {
  console.log('User was updated');
  console.log('Original age:', changes[META].age?.original);
}
```

### Change Detection Helpers

```typescript
import { update, hasChanges, anyChange, typeChange } from 'tsqn';

const changes = update(data, {
  user: {
    name: 'Bob',
    age: '31'  // Changed from number to string
  }
});

// Check if specific fields changed
const hasUserChanges = hasChanges(changes, {
  user: {
    name: anyChange,      // Any change occurred
    age: typeChange       // Type changed
  }
});

// Custom change detectors
const hasSignificantChange = hasChanges(changes, {
  user: {
    age: (change) => {
      const diff = change.value - change.original;
      return Math.abs(diff) > 10;
    }
  }
});
```

## Operators

### ALL - Bulk Updates

Apply the same update to all properties or array elements:

```typescript
import { update, ALL } from 'tsqn';

const inventory = {
  item1: { price: 10, inStock: false },
  item2: { price: 20, inStock: false },
  item3: { price: 30, inStock: false }
};

// Update all items
update(inventory, {
  [ALL]: {
    inStock: true,
    price: (p) => p * 1.1  // 10% price increase
  }
});

// Works with arrays too
const numbers = [1, 2, 3, 4, 5];
update(numbers, {
  [ALL]: (n) => n * 2
});
// Result: [2, 4, 6, 8, 10]
```

### WHERE - Conditional Updates

Update only items matching a condition:

```typescript
import { update, ALL, WHERE } from 'tsqn';

const products = [
  { id: 1, name: 'Laptop', price: 1000, category: 'electronics' },
  { id: 2, name: 'Book', price: 20, category: 'books' },
  { id: 3, name: 'Phone', price: 800, category: 'electronics' }
];

// Update only electronics
update(products, {
  [ALL]: {
    [WHERE]: (item) => item.category === 'electronics',
    price: (p) => p * 0.9  // 10% discount
  }
});

// With predicates
import { GT } from 'tsqn';

update(products, {
  [ALL]: {
    [WHERE]: { price: { [GT]: 500 } },
    premium: true  // Add premium flag to expensive items
  }
});
```

### DEFAULT - Initialize Null Fields

Initialize null/undefined fields before updating:

```typescript
import { update, DEFAULT } from 'tsqn';

const user = {
  name: 'Alice',
  profile: null
};

// Initialize profile if null, then update
update(user, {
  profile: {
    [DEFAULT]: { bio: '', avatar: '', location: '' },
    bio: 'Developer',
    location: 'New York'
  }
});
// Result: {
//   name: 'Alice',
//   profile: { bio: 'Developer', avatar: '', location: 'New York' }
// }

// Works with arrays
const data = { items: null };
update(data, {
  items: {
    [DEFAULT]: [],
    '0': 'First item'
  }
});
// Result: { items: ['First item'] }
```

### CONTEXT - Pass Variables

Pass context through the update traversal:

```typescript
import { update, CONTEXT, ALL } from 'tsqn';

const cart = {
  items: [
    { name: 'Laptop', price: 1000, quantity: 1 },
    { name: 'Mouse', price: 50, quantity: 2 }
  ],
  subtotal: 0,
  total: 0
};

update(cart, {
  [CONTEXT]: { taxRate: 0.08, shipping: 10 },
  items: {
    [ALL]: {
      total: (_, item, key, ctx) => item.price * item.quantity
    }
  },
  subtotal: (_, cart) => 
    cart.items.reduce((sum, item) => sum + item.total, 0),
  total: (_, cart, key, ctx) => 
    cart.subtotal * (1 + ctx.taxRate) + ctx.shipping
});
```

## Replacement vs Merge

### Partial Updates (Default)

By default, updates merge with existing data:

```typescript
const user = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
};

// Partial update - only age changes
update(user, {
  age: 31
});
// Result: { name: 'Alice', age: 31, email: 'alice@example.com' }
```

### Full Replacement

Use array syntax `[]` to replace entire values:

```typescript
// Replace entire object
update(user, {
  profile: [{ bio: 'New bio' }]  // Replaces entire profile
});

// Replace array
const data = { tags: ['old', 'tags'] };
update(data, {
  tags: [['new', 'tags']]  // Full replacement
});
```

### Delete Properties

Use empty array `[]` to delete optional properties:

```typescript
interface User {
  name: string;
  age: number;
  nickname?: string;
  avatar?: string;
}

const user: User = {
  name: 'Alice',
  age: 30,
  nickname: 'Ali',
  avatar: 'avatar.png'
};

// Delete optional properties
update(user, {
  nickname: [],  // Removes nickname
  avatar: []     // Removes avatar
});
// Result: { name: 'Alice', age: 30 }
```

## Transactions

Group multiple updates with commit/rollback capability:

```typescript
import { transaction, ALL } from 'tsqn';

const gameState = {
  player: {
    health: 100,
    mana: 50,
    gold: 1000
  },
  enemies: [
    { id: 1, health: 50 },
    { id: 2, health: 30 }
  ]
};

// Start transaction
const tx = transaction(gameState);

// Chain multiple updates
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

// Check if we should commit
if (gameState.player.health <= 0) {
  tx.revert();  // Player died, revert all changes
  console.log('Game Over!');
} else {
  const changes = tx.commit();
  console.log('Turn completed');
  // Can still undo later with: undo(gameState, changes)
}
```

## Undo/Redo

### Basic Undo

```typescript
import { update, undo } from 'tsqn';

const state = { counter: 0, name: 'Start' };

// Make changes
const changes1 = update(state, { counter: 1, name: 'First' });
const changes2 = update(state, { counter: 2, name: 'Second' });

// Undo last change
undo(state, changes2);
console.log(state); // { counter: 1, name: 'First' }

// Undo first change
undo(state, changes1);
console.log(state); // { counter: 0, name: 'Start' }
```

### Undo Stack Implementation

```typescript
class UndoManager<T> {
  private undoStack: any[] = [];
  private redoStack: any[] = [];
  
  constructor(private data: T) {}
  
  execute(updates: any) {
    const changes = update(this.data, updates);
    if (changes) {
      this.undoStack.push(changes);
      this.redoStack = []; // Clear redo stack
    }
    return changes;
  }
  
  undo() {
    const changes = this.undoStack.pop();
    if (changes) {
      undo(this.data, changes);
      this.redoStack.push(changes);
      return true;
    }
    return false;
  }
  
  redo() {
    const changes = this.redoStack.pop();
    if (changes) {
      // Re-apply the changes
      const reapplied = update(this.data, changes);
      this.undoStack.push(reapplied);
      return true;
    }
    return false;
  }
  
  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
}

// Usage
const manager = new UndoManager({ value: 0 });
manager.execute({ value: 1 });
manager.execute({ value: 2 });
manager.undo(); // value back to 1
manager.redo(); // value back to 2
```

## Advanced Patterns

### Computed Properties

```typescript
const state = {
  items: [
    { price: 10, quantity: 2 },
    { price: 20, quantity: 3 }
  ],
  subtotal: 0,
  tax: 0,
  total: 0
};

// Update with computed values
update(state, {
  items: {
    [ALL]: {
      lineTotal: (_, item) => item.price * item.quantity
    }
  },
  subtotal: (_, state) => 
    state.items.reduce((sum, item) => sum + item.lineTotal, 0),
  tax: (_, state) => state.subtotal * 0.08,
  total: (_, state) => state.subtotal + state.tax
});
```

### Conditional Updates

```typescript
function updateUser(user: User, updates: any, isAdmin: boolean) {
  return update(user, {
    ...updates,
    ...(isAdmin && {
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    })
  });
}
```

### Batch Updates

```typescript
function batchUpdate<T>(data: T, updates: any[]) {
  let allChanges = [];
  
  for (const updateSpec of updates) {
    const changes = update(data, updateSpec);
    if (changes) {
      allChanges.push(changes);
    }
  }
  
  return allChanges;
}

// Usage
const changes = batchUpdate(state, [
  { user: { lastLogin: Date.now() } },
  { stats: { loginCount: (c) => c + 1 } },
  { activity: { [ALL]: { viewed: true } } }
]);
```

### Type-Safe Updates

```typescript
interface AppState {
  user: {
    name: string;
    age: number;
    preferences?: {
      theme: 'light' | 'dark';
      language: string;
    };
  };
  settings: {
    autoSave: boolean;
  };
}

const state: AppState = {
  user: { name: 'Alice', age: 30 },
  settings: { autoSave: true }
};

// TypeScript ensures valid updates
update(state, {
  user: {
    age: 31,                        // ✓ Valid
    preferences: {
      theme: 'dark',                // ✓ Valid enum value
      language: 'en'
    }
  },
  // @ts-expect-error
  invalid: 'field'                  // ✗ Type error
});

// Type error for wrong value types
update(state, {
  user: {
    // @ts-expect-error
    age: '31'                       // ✗ Must be number
  }
});
```

## Best Practices

1. **Use functions for relative updates** - Avoids race conditions
2. **Check return value** - undefined means no changes were made
3. **Store changes for undo** - Keep change objects if you need undo functionality
4. **Use transactions for complex updates** - Group related changes
5. **Leverage TypeScript** - Get compile-time safety for updates
6. **Use appropriate operators** - ALL for bulk, WHERE for conditional, DEFAULT for initialization
7. **Consider performance** - Function transforms are called for each item
8. **Test edge cases** - null values, empty arrays, missing properties
9. **Document complex updates** - Especially when using multiple operators
10. **Avoid mutations in functions** - Transform functions should be pure