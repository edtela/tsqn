# Selection Guide

The selection system in TSQN allows you to extract, filter, and reshape data with type-safe queries.

## Table of Contents
- [Basic Selection](#basic-selection)
- [ALL Operator](#all-operator)
- [WHERE Operator](#where-operator)
- [Array Selection](#array-selection)
- [Combining Operators](#combining-operators)
- [Type Safety](#type-safety)
- [Advanced Patterns](#advanced-patterns)

## Basic Selection

### Simple Property Selection

```typescript
import { select } from 'tsqn';

const user = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  profile: {
    bio: 'Software Developer',
    location: 'New York',
    social: {
      twitter: '@alice',
      github: 'alice-dev'
    }
  }
};

// Select specific top-level fields
const basic = select(user, {
  name: true,
  email: true
});
// Result: { name: 'Alice', email: 'alice@example.com' }

// Select nested fields
const nested = select(user, {
  name: true,
  profile: {
    bio: true,
    social: {
      github: true
    }
  }
});
// Result: { 
//   name: 'Alice',
//   profile: {
//     bio: 'Software Developer',
//     social: { github: 'alice-dev' }
//   }
// }
```

### Handling Missing Properties

```typescript
const data = { name: 'Alice' };

// Selecting non-existent properties returns undefined
const result = select(data, {
  name: true,
  email: true  // doesn't exist
} as any);
// Result: { name: 'Alice', email: undefined }

// Selecting from primitives returns undefined
const primitive = 'hello';
const primResult = select(primitive, { length: true } as any);
// Result: undefined (new behavior - selecting from primitives returns undefined)
```

## ALL Operator

The ALL operator applies selection to all properties or array elements.

### Object Properties

```typescript
import { select, ALL } from 'tsqn';

const products = {
  laptop: { name: 'MacBook', price: 1500, stock: 10 },
  phone: { name: 'iPhone', price: 1000, stock: 25 },
  tablet: { name: 'iPad', price: 800, stock: 15 }
};

// Select all products (full copy)
const allProducts = select(products, {
  [ALL]: true
});

// Select specific fields from all products
const names = select(products, {
  [ALL]: {
    name: true,
    price: true
  }
});
// Result: {
//   laptop: { name: 'MacBook', price: 1500 },
//   phone: { name: 'iPhone', price: 1000 },
//   tablet: { name: 'iPad', price: 800 }
// }
```

### Array Elements

```typescript
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'user' }
];

// Select specific fields from all array elements
const userNames = select(users, {
  [ALL]: {
    id: true,
    name: true
  }
});
// Result: [
//   { id: 1, name: 'Alice' },
//   { id: 2, name: 'Bob' },
//   { id: 3, name: 'Charlie' }
// ]
```

### Combining ALL with Specific Selections

```typescript
const data = {
  a: { value: 1, extra: 'a' },
  b: { value: 2, extra: 'b' },
  c: { value: 3, extra: 'c' }
};

// ALL and specific selections merge (new behavior)
const result = select(data, {
  [ALL]: { value: true },      // Select value from all
  b: { extra: true }            // Also select extra from b
});
// Result: {
//   a: { value: 1 },
//   b: { value: 2, extra: 'b' },  // Both value and extra
//   c: { value: 3 }
// }
```

## WHERE Operator

The WHERE operator filters data based on predicates or functions.

### Function Predicates

```typescript
import { select, WHERE, ALL } from 'tsqn';

const products = [
  { id: 1, name: 'Laptop', price: 1500, inStock: true },
  { id: 2, name: 'Mouse', price: 50, inStock: false },
  { id: 3, name: 'Keyboard', price: 150, inStock: true }
];

// Filter with function predicate
const available = select(products, {
  [ALL]: {
    [WHERE]: (item) => item.inStock && item.price < 1000,
    name: true,
    price: true
  }
});
// Result: [{ name: 'Keyboard', price: 150 }]
```

### Declarative Predicates

```typescript
import { select, WHERE, ALL, GT, LT } from 'tsqn';

const inventory = {
  item1: { name: 'Laptop', price: 1500, stock: 5 },
  item2: { name: 'Mouse', price: 50, stock: 0 },
  item3: { name: 'Keyboard', price: 150, stock: 10 }
};

// Using predicate operators
const available = select(inventory, {
  [ALL]: {
    [WHERE]: {
      price: { [LT]: 200 },
      stock: { [GT]: 0 }
    },
    name: true,
    stock: true
  }
});
// Result: { item3: { name: 'Keyboard', stock: 10 } }
```

### Object-Level WHERE

```typescript
const data = {
  count: 5,
  items: ['a', 'b', 'c']
};

// Filter entire object
const result = select(data, {
  [WHERE]: (obj) => obj.count > 3,
  items: true
});
// Result: { items: ['a', 'b', 'c'] }

const filtered = select(data, {
  [WHERE]: (obj) => obj.count > 10,
  items: true
});
// Result: undefined (object doesn't match predicate)
```

## Array Selection

### Direct Index Selection

```typescript
const data = ['a', 'b', 'c', 'd', 'e'];

// Select specific indices (creates sparse array)
const sparse = select(data, {
  '0': true,
  '2': true,
  '4': true
});
// Result: ['a', undefined, 'c', undefined, 'e']

// Select with transformations
const items = [
  { id: 1, name: 'First' },
  { id: 2, name: 'Second' },
  { id: 3, name: 'Third' }
];

const selected = select(items, {
  '0': { name: true },
  '2': { id: true }
});
// Result: [{ name: 'First' }, undefined, { id: 3 }]
```

### Tuple-Like Selection

```typescript
const tuple: [string, number, boolean] = ['hello', 42, true];

const result = select(tuple, {
  '0': true,
  '2': true
});
// Result: ['hello', undefined, true]
```

### Filtering Arrays

```typescript
import { select, ALL, WHERE } from 'tsqn';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Filter and create dense array
const evens = select(numbers, {
  [ALL]: {
    [WHERE]: (n) => n % 2 === 0
  }
});
// Result: [2, 4, 6, 8, 10]

// Filter objects in array
const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true }
];

const activeAdults = select(users, {
  [ALL]: {
    [WHERE]: (u) => u.active && u.age >= 30,
    name: true,
    age: true
  }
});
// Result: [
//   { name: 'Alice', age: 30 },
//   { name: 'Charlie', age: 35 }
// ]
```

## Combining Operators

### Nested Arrays and Objects

```typescript
const data = {
  categories: [
    {
      name: 'Electronics',
      items: [
        { id: 1, name: 'Laptop', price: 1500 },
        { id: 2, name: 'Phone', price: 1000 }
      ]
    },
    {
      name: 'Books',
      items: [
        { id: 3, name: 'Novel', price: 15 },
        { id: 4, name: 'Textbook', price: 80 }
      ]
    }
  ]
};

// Complex nested selection
const expensive = select(data, {
  categories: {
    [ALL]: {
      name: true,
      items: {
        [ALL]: {
          [WHERE]: (item) => item.price > 50,
          name: true,
          price: true
        }
      }
    }
  }
});
// Result: {
//   categories: [
//     {
//       name: 'Electronics',
//       items: [
//         { name: 'Laptop', price: 1500 },
//         { name: 'Phone', price: 1000 }
//       ]
//     },
//     {
//       name: 'Books',
//       items: [{ name: 'Textbook', price: 80 }]
//     }
//   ]
// }
```

### Mixed Selection Patterns

```typescript
const company = {
  info: {
    name: 'TechCorp',
    founded: 2010
  },
  departments: {
    engineering: {
      employees: [
        { id: 1, name: 'Alice', salary: 100000 },
        { id: 2, name: 'Bob', salary: 90000 }
      ]
    },
    sales: {
      employees: [
        { id: 3, name: 'Charlie', salary: 80000 },
        { id: 4, name: 'Diana', salary: 85000 }
      ]
    }
  }
};

// Combine direct selection, ALL, and WHERE
const highEarners = select(company, {
  info: { name: true },
  departments: {
    [ALL]: {
      employees: {
        [ALL]: {
          [WHERE]: (emp) => emp.salary > 85000,
          name: true,
          salary: true
        }
      }
    }
  }
});
// Result: {
//   info: { name: 'TechCorp' },
//   departments: {
//     engineering: {
//       employees: [
//         { name: 'Alice', salary: 100000 },
//         { name: 'Bob', salary: 90000 }
//       ]
//     },
//     sales: {
//       employees: []
//     }
//   }
// }
```

## Type Safety

TSQN provides full type inference for selections:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
  profile: {
    bio: string;
    avatar?: string;
  };
}

const user: User = {
  id: 1,
  name: 'Alice',
  profile: { bio: 'Developer' }
};

// Type-safe selection
const result = select(user, {
  name: true,
  profile: {
    bio: true
  }
});
// Type of result: { name: string; profile: { bio: string } }

// TypeScript prevents invalid selections
const invalid = select(user, {
  // @ts-expect-error - 'invalid' doesn't exist on User
  invalid: true
});
```

## Advanced Patterns

### Dynamic Field Selection

```typescript
const fields = ['name', 'email'] as const;
const selection = fields.reduce(
  (acc, field) => ({ ...acc, [field]: true }),
  {}
);

const result = select(user, selection);
```

### Conditional Selection

```typescript
function selectUserData(user: User, includePrivate: boolean) {
  return select(user, {
    name: true,
    ...(includePrivate && {
      email: true,
      profile: {
        bio: true,
        avatar: true
      }
    })
  });
}
```

### Record Types

```typescript
const userMap: Record<string, User> = {
  'user123': { id: 1, name: 'Alice', age: 30 },
  'user456': { id: 2, name: 'Bob', age: 25 }
};

// Select from specific keys
const selected = select(userMap, {
  'user123': { name: true },
  'user456': { age: true }
});
// Result: { 'user123': { name: 'Alice' }, 'user456': { age: 25 } }

// Select all with ALL
const all = select(userMap, {
  [ALL]: {
    name: true,
    age: true
  }
});
```

### Performance Considerations

```typescript
// For large datasets, use WHERE early to filter
const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  value: Math.random() * 1000,
  category: i % 10
}));

// Efficient: Filter first, then select fields
const efficient = select(largeDataset, {
  [ALL]: {
    [WHERE]: (item) => item.category === 5 && item.value > 500,
    id: true,
    value: true
  }
});

// Less efficient: Select all fields, filter later
const lessEfficient = select(largeDataset, {
  [ALL]: true
}).filter(item => item.category === 5 && item.value > 500);
```

## Best Practices

1. **Use specific field selection** to minimize data transfer and memory usage
2. **Apply WHERE filters early** in nested structures for better performance
3. **Leverage type safety** - let TypeScript guide valid selections
4. **Combine operators thoughtfully** - understand how ALL, WHERE, and specific selections interact
5. **Handle edge cases** - consider empty arrays, null values, and missing properties
6. **Use declarative predicates** when possible for clearer intent
7. **Test with realistic data** - ensure selections work with your actual data structures