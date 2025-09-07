# Predicates Guide

TSQN's predicate system provides a powerful and flexible way to filter and match data using declarative patterns.

## Table of Contents
- [Basic Concepts](#basic-concepts)
- [Comparison Operators](#comparison-operators)
- [Logical Operators](#logical-operators)
- [Pattern Matching](#pattern-matching)
- [Object and Array Predicates](#object-and-array-predicates)
- [Advanced Patterns](#advanced-patterns)
- [Common Pitfalls](#common-pitfalls)

## Basic Concepts

Predicates in TSQN can be:
1. **Direct values** - Exact equality check
2. **Arrays** - OR conditions (matches if any element matches)
3. **Objects** - AND conditions (all properties must match)
4. **Operator expressions** - Using symbols for complex comparisons

```typescript
import { evalPredicate } from 'tsqn';

// Direct value - exact match
evalPredicate(5, 5);                              // true
evalPredicate('hello', 'hello');                  // true

// Array - OR condition
evalPredicate(5, [3, 5, 7]);                      // true (5 is in array)
evalPredicate('apple', ['apple', 'banana']);      // true

// Object - AND condition
evalPredicate(
  { name: 'Alice', age: 30 },
  { name: 'Alice', age: 30 }
);                                                 // true
```

## Comparison Operators

### Numeric and String Comparisons

```typescript
import { evalPredicate, GT, GTE, LT, LTE } from 'tsqn';

// Greater than
evalPredicate(5, { [GT]: 3 });                    // true
evalPredicate('b', { [GT]: 'a' });                // true (alphabetical)

// Greater than or equal
evalPredicate(5, { [GTE]: 5 });                   // true
evalPredicate(5, { [GTE]: 6 });                   // false

// Less than
evalPredicate(3, { [LT]: 5 });                    // true
evalPredicate('a', { [LT]: 'b' });                // true

// Less than or equal
evalPredicate(5, { [LTE]: 5 });                   // true
evalPredicate(6, { [LTE]: 5 });                   // false

// Multiple conditions (AND)
evalPredicate(5, { [GT]: 0, [LT]: 10 });         // true
evalPredicate(15, { [GT]: 0, [LT]: 10 });        // false
```

### Equality Operators

```typescript
import { evalPredicate, EQ, NEQ, NOT } from 'tsqn';

// EQ - Loose equality (uses ==)
evalPredicate(null, { [EQ]: null });              // true
evalPredicate(undefined, { [EQ]: null });         // true (undefined == null)
evalPredicate(0, { [EQ]: false });                // true (0 == false)
evalPredicate('5', { [EQ]: 5 });                  // true ('5' == 5)

// NEQ - Loose inequality (uses !=)
evalPredicate(5, { [NEQ]: null });                // true
evalPredicate(null, { [NEQ]: null });             // false
evalPredicate(undefined, { [NEQ]: null });        // false (undefined != null is false)

// NOT - Strict inequality for primitives, negation for complex predicates
evalPredicate(5, { [NOT]: 3 });                   // true (5 !== 3)
evalPredicate(null, { [NOT]: undefined });        // true (null !== undefined)
evalPredicate(5, { [NOT]: '5' });                 // true (5 !== '5')

// NOT with complex predicates
evalPredicate(5, { [NOT]: { [GT]: 10 } });       // true (NOT(5 > 10))
evalPredicate(5, { [NOT]: [3, 5, 7] });          // false (NOT(5 in [3,5,7]))
```

## Pattern Matching

### String Pattern Matching with MATCH

```typescript
import { evalPredicate, MATCH } from 'tsqn';

// Basic pattern (regex without flags)
evalPredicate('hello@example.com', { [MATCH]: '.*@.*\\.com' });     // true
evalPredicate('test@example.org', { [MATCH]: '.*@.*\\.com' });      // false

// With flags using /pattern/flags syntax
evalPredicate('HELLO', { [MATCH]: '/hello/i' });                    // true (case insensitive)
evalPredicate('Hello World', { [MATCH]: '/^hello/i' });             // true
evalPredicate('Say Hello', { [MATCH]: '/^hello/i' });               // false

// Complex patterns
evalPredicate('admin_user', { [MATCH]: '^admin' });                 // true
evalPredicate('user_admin', { [MATCH]: '^admin' });                 // false
evalPredicate('123-45-6789', { [MATCH]: '\\d{3}-\\d{2}-\\d{4}' }); // true (SSN pattern)
```

## Object and Array Predicates

### Object Field Matching

```typescript
import { evalPredicate, GT, MATCH } from 'tsqn';

const user = {
  name: 'Alice Johnson',
  age: 30,
  email: 'alice@example.com',
  role: 'admin'
};

// Simple field matching
evalPredicate(user, { name: 'Alice Johnson' });                    // true
evalPredicate(user, { role: 'admin' });                           // true

// Multiple fields (AND condition)
evalPredicate(user, {
  name: 'Alice Johnson',
  role: 'admin'
});                                                                 // true

// Nested operators
evalPredicate(user, {
  age: { [GT]: 18 },
  email: { [MATCH]: '.*@example\\.com' }
});                                                                 // true

// Field with OR values
evalPredicate(user, {
  role: ['admin', 'moderator', 'user']                            // OR condition
});                                                                 // true
```

### Missing Fields

```typescript
import { evalPredicate, EQ, NEQ, NOT } from 'tsqn';

const data = { name: 'Alice' };  // no 'email' field

// Missing fields are treated as undefined
evalPredicate(data, { email: { [EQ]: null } });                   // true (undefined == null)
evalPredicate(data, { email: { [NEQ]: null } });                  // false
evalPredicate(data, { email: { [NOT]: null } });                  // true (undefined !== null)
evalPredicate(data, { email: undefined });                        // true
```

### Array Element Predicates

```typescript
import { evalPredicate, ALL, SOME, GT, LT } from 'tsqn';

// ALL - Every element must match
const numbers = [2, 4, 6, 8];
evalPredicate(numbers, { [ALL]: { [GT]: 0 } });                   // true (all > 0)
evalPredicate(numbers, { [ALL]: { [GT]: 5 } });                   // false (not all > 5)
evalPredicate(numbers, { [ALL]: [2, 4, 6, 8, 10] });             // true (all in set)

// SOME - At least one element must match
evalPredicate(numbers, { [SOME]: { [GT]: 5 } });                  // true (6, 8 > 5)
evalPredicate(numbers, { [SOME]: { [GT]: 10 } });                 // false (none > 10)

// Complex array of objects
const users = [
  { name: 'Alice', role: 'admin', age: 30 },
  { name: 'Bob', role: 'user', age: 25 },
  { name: 'Charlie', role: 'user', age: 35 }
];

evalPredicate(users, {
  [SOME]: { role: 'admin' }                                       // true (Alice is admin)
});

evalPredicate(users, {
  [ALL]: [
    { role: 'admin' },
    { age: { [GT]: 20 } }
  ]                                                                // true (all match one condition)
});

evalPredicate(users, {
  [SOME]: {
    role: 'user',
    age: { [GT]: 30 }
  }                                                                // true (Charlie matches both)
});
```

### Empty Collections

```typescript
import { evalPredicate, ALL, SOME, GT } from 'tsqn';

const empty = [];

// ALL on empty array is vacuously true
evalPredicate(empty, { [ALL]: { [GT]: 0 } });                     // true

// SOME on empty array is false (no elements to match)
evalPredicate(empty, { [SOME]: { [GT]: 0 } });                    // false
```

## Advanced Patterns

### Nested Predicates

```typescript
import { evalPredicate, GT, GTE, MATCH } from 'tsqn';

const data = {
  user: {
    profile: {
      name: 'Alice',
      age: 30,
      settings: {
        theme: 'dark',
        notifications: true
      }
    }
  }
};

evalPredicate(data, {
  user: {
    profile: {
      name: 'Alice',
      age: { [GTE]: 18 },
      settings: {
        theme: ['dark', 'auto']                                   // OR for theme values
      }
    }
  }
});                                                                // true
```

### Combining OR and AND

```typescript
import { evalPredicate, GT, LT, MATCH } from 'tsqn';

// OR at top level
const value: string | number = 5;
evalPredicate(value, [
  { [MATCH]: '^admin' },    // For strings
  { [GT]: 3 }                // For numbers
]);                          // true (5 > 3)

// Mixed conditions
const product = { name: 'Laptop', price: 1000, stock: 5 };

// Match products that are either:
// - Named 'Laptop' OR
// - Priced under 500 AND in stock
evalPredicate(product, [
  { name: 'Laptop' },
  { 
    price: { [LT]: 500 },
    stock: { [GT]: 0 }
  }
]);                          // true (matches first condition)
```

### NOT with Complex Predicates

```typescript
import { evalPredicate, NOT, GT, MATCH } from 'tsqn';

const user = { name: 'Alice', status: 'active', score: 75 };

// NOT with OR array
evalPredicate(user, {
  status: { [NOT]: ['deleted', 'archived', 'suspended'] }
});                                                                // true

// NOT with object predicate
evalPredicate(user, {
  [NOT]: {
    status: 'inactive',
    score: { [LT]: 50 }
  }
});                                                                // true (NOT(inactive AND score<50))

// Combining NOT with other operators
evalPredicate(user, {
  name: { [NOT]: { [MATCH]: '^admin' } },
  score: { [NOT]: { [GT]: 100 } }
});                                                                // true
```

## Common Pitfalls

### 1. Null vs Undefined Confusion

```typescript
// Be aware of JavaScript's equality rules
evalPredicate(undefined, { [EQ]: null });                         // true (== comparison)
evalPredicate(undefined, { [NOT]: null });                        // true (!== comparison)
evalPredicate(undefined, null);                                   // false (direct comparison)
```

### 2. DEEP_ALL Fuzzy Matching

When using predicates with DEEP_ALL, remember that parent objects without the field will also match:

```typescript
const data = {
  root: {               // root.value is undefined
    child: {
      value: null       // child.value is null
    }
  }
};

// Both root and child match { value: { [EQ]: null } }
// To avoid this, add constraints:
select(data, {
  [DEEP_ALL]: {
    [WHERE]: { 
      value: { [EQ]: null },
      // Add constraint to only match objects with certain fields
      child: { [NOT]: undefined }  
    }
  }
});
```

### 3. Type Mismatches

Operators are type-specific:

```typescript
// MATCH only works on strings
evalPredicate(123, { [MATCH]: '123' });                          // false

// GT/LT only work on numbers and strings
evalPredicate(true, { [GT]: false });                            // false

// Arrays need ALL/SOME for element matching
evalPredicate([1, 2, 3], { [GT]: 0 });                          // false
evalPredicate([1, 2, 3], { [ALL]: { [GT]: 0 } });               // true
```

### 4. Missing Return in ALL/SOME

Ensure predicates properly evaluate in ALL/SOME contexts:

```typescript
const data = [
  { status: 'active', count: 10 },
  { status: 'inactive', count: 0 }
];

// Correct - will properly evaluate
evalPredicate(data, {
  [SOME]: {
    status: 'active',
    count: { [GT]: 5 }
  }
});                                                               // true

// Be careful with complex nested conditions
evalPredicate(data, {
  [ALL]: [
    { status: ['active', 'pending'] },  // Each item must match ONE of these
    { count: { [GTE]: 0 } }
  ]
});                                                               // false (inactive doesn't match)
```

## Best Practices

1. **Use specific predicates in DEEP_ALL** to avoid matching unintended parent objects
2. **Prefer EQ for null checking** when you want to match both null and undefined
3. **Use NOT carefully** - understand the difference between NOT on values vs predicates
4. **Test edge cases** - empty arrays, missing fields, null/undefined values
5. **Combine operators thoughtfully** - understand AND vs OR semantics
6. **Use type guards** when dealing with union types to ensure correct predicate application