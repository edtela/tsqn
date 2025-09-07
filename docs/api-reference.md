# API Reference

Complete API documentation for TSQN (TypeScript Query Notation).

## Table of Contents
- [Core Functions](#core-functions)
- [Symbols](#symbols)
- [Predicate Functions](#predicate-functions)
- [Change Detection](#change-detection)
- [Type Definitions](#type-definitions)

## Core Functions

### `update<T>(data: T, statement: Update<T>, changes?: UpdateResult<T>): UpdateResult<T> | undefined`

Updates data in place according to the update statement and returns change metadata.

#### Parameters
- `data: T` - The data to update (modified in place)
- `statement: Update<T>` - The update specification
- `changes?: UpdateResult<T>` - Optional existing changes to merge with

#### Returns
- `UpdateResult<T> | undefined` - Change metadata with [META] symbol, or undefined if no changes

#### Example
```typescript
const data = { name: 'Alice', age: 30 };
const changes = update(data, { age: 31 });
// changes[META] contains: { age: { original: 30 } }
```

---

### `select<T>(data: T, statement: Select<T>): SelectResult<T> | undefined`

Extracts and filters data based on the selection statement.

#### Parameters
- `data: T` - The data to select from
- `statement: Select<T>` - The selection specification

#### Returns
- `SelectResult<T> | undefined` - Selected data or undefined if no match

#### Example
```typescript
const data = { name: 'Alice', age: 30, email: 'alice@example.com' };
const result = select(data, { name: true, age: true });
// result: { name: 'Alice', age: 30 }
```

---

### `undo<T>(data: T, changes: UpdateResult<T>): void`

Reverts changes made by an update operation.

#### Parameters
- `data: T` - The data to revert (modified in place)
- `changes: UpdateResult<T>` - The change metadata from update()

#### Example
```typescript
const data = { value: 10 };
const changes = update(data, { value: 20 });
undo(data, changes);
// data.value is back to 10
```

---

### `transaction<T>(data: T): Transaction<T>`

Creates a transaction for grouping multiple updates with commit/rollback capability.

#### Returns
Transaction object with methods:
- `update(statement: Update<T>): Transaction<T>` - Apply an update
- `commit(): UpdateResult<T> | undefined` - Commit all changes
- `revert(): void` - Revert all changes

#### Example
```typescript
const tx = transaction(data);
tx.update({ field1: 'value1' })
  .update({ field2: 'value2' });
  
if (isValid) {
  tx.commit();
} else {
  tx.revert();
}
```

---

### `evalPredicate<T>(value: T, predicate: Predicate<T>): boolean`

Evaluates a predicate against a value.

#### Parameters
- `value: T` - The value to test
- `predicate: Predicate<T>` - The predicate specification

#### Returns
- `boolean` - True if the value matches the predicate

#### Example
```typescript
evalPredicate(5, { [GT]: 3 });              // true
evalPredicate('hello', { [MATCH]: '^h' });  // true
```

---

### `hasChanges<T>(result: UpdateResult<T>, detector: ChangeDetector<T>): boolean`

Checks if specific changes occurred in an update result.

#### Parameters
- `result: UpdateResult<T>` - The change metadata from update()
- `detector: ChangeDetector<T>` - Specification of what changes to detect

#### Returns
- `boolean` - True if specified changes were detected

#### Example
```typescript
const changes = update(data, { age: 31, name: 'Bob' });
hasChanges(changes, { age: anyChange });    // true
hasChanges(changes, { email: anyChange });  // false
```

## Symbols

### Update Operators

#### `ALL`
Apply updates or selections to all properties/elements.
```typescript
update(data, { [ALL]: { status: 'active' } });
select(data, { [ALL]: { name: true } });
```

#### `WHERE`
Filter based on condition (predicate or function).
```typescript
update(data, {
  [ALL]: {
    [WHERE]: (item) => item.age > 18,
    adult: true
  }
});
```

#### `DEFAULT`
Initialize null/undefined fields before updating.
```typescript
update(data, {
  profile: {
    [DEFAULT]: { bio: '', avatar: '' },
    bio: 'Developer'
  }
});
```

#### `CONTEXT`
Pass context variables through update traversal.
```typescript
update(data, {
  [CONTEXT]: { multiplier: 2 },
  values: {
    [ALL]: (v, item, key, ctx) => v * ctx.multiplier
  }
});
```

#### `META`
Access change metadata in update results.
```typescript
const changes = update(data, { age: 31 });
console.log(changes[META].age.original); // 30
```

#### `DEEP_ALL`
Recursively search and select at any depth.
```typescript
select(data, {
  [DEEP_ALL]: {
    [WHERE]: { price: { [GT]: 100 } },
    name: true,
    price: true
  }
});
```

### Predicate Operators

#### Comparison Operators
- `GT` - Greater than (`>`)
- `GTE` - Greater than or equal (`>=`)
- `LT` - Less than (`<`)
- `LTE` - Less than or equal (`<=`)

```typescript
evalPredicate(5, { [GT]: 3 });    // true
evalPredicate(5, { [LTE]: 5 });   // true
```

#### Equality Operators
- `EQ` - Loose equality (`==`)
- `NEQ` - Loose inequality (`!=`)
- `NOT` - Strict inequality for primitives, logical NOT for predicates

```typescript
evalPredicate(null, { [EQ]: undefined });    // true (null == undefined)
evalPredicate(5, { [NEQ]: '5' });            // false (5 != '5' is false)
evalPredicate(5, { [NOT]: '5' });            // true (5 !== '5')
```

#### Pattern Matching
- `MATCH` - Regular expression matching for strings

```typescript
evalPredicate('hello@example.com', { [MATCH]: '.*@.*\\.com' });
evalPredicate('HELLO', { [MATCH]: '/hello/i' });  // Case insensitive
```

#### Collection Operators
- `ALL` - All elements must match (arrays/objects)
- `SOME` - At least one element must match

```typescript
evalPredicate([2, 4, 6], { [ALL]: { [GT]: 0 } });   // true
evalPredicate([1, 2, 3], { [SOME]: { [GT]: 2 } });  // true
```

## Predicate Functions

### `testOperator(value: any, operator: symbol, condition: any): boolean`

Tests a single operator against a value. Used internally by evalPredicate.

#### Parameters
- `value: any` - The value to test
- `operator: symbol` - The operator symbol (GT, LT, etc.)
- `condition: any` - The condition to test against

#### Returns
- `boolean` - True if the operator condition is met

## Change Detection

### `anyChange`
Detects any change to a field.
```typescript
hasChanges(result, { field: anyChange });
```

### `typeChange`
Detects when a field's type changes.
```typescript
hasChanges(result, { 
  age: typeChange  // Detects if age changed from number to string
});
```

### Custom Detectors
Create custom change detectors:
```typescript
const significantChange = (change: any) => {
  return Math.abs(change.value - change.original) > 10;
};

hasChanges(result, { score: significantChange });
```

## Type Definitions

### Core Types

```typescript
// Update statement type
type Update<T> = {
  [K in keyof T]?: 
    | T[K]                          // Direct value
    | ((value: T[K], item: T, key: K, context?: any) => T[K])  // Function
    | Update<T[K]>                  // Nested update
    | [T[K]]                        // Replacement
    | []                            // Deletion (for optional fields)
} & {
  [ALL]?: Update<T[keyof T]>;
  [WHERE]?: Predicate<T> | ((item: T) => boolean);
  [DEFAULT]?: Partial<T>;
  [CONTEXT]?: any;
};

// Selection statement type
type Select<T> = {
  [K in keyof T]?: 
    | true                          // Select field
    | Select<T[K]>                  // Nested selection
} & {
  [ALL]?: true | Select<T[keyof T]>;
  [WHERE]?: Predicate<T> | ((item: T) => boolean);
  [DEEP_ALL]?: Select<any>;
};

// Predicate type
type Predicate<T> = 
  | T                               // Direct value
  | T[]                             // OR array
  | {
      [K in keyof T]?: Predicate<T[K]>
    }                               // Field predicates
  | {
      [GT]?: T;
      [GTE]?: T;
      [LT]?: T;
      [LTE]?: T;
      [EQ]?: T;
      [NEQ]?: T;
      [NOT]?: Predicate<T>;
      [MATCH]?: string;
      [ALL]?: Predicate<T extends (infer U)[] ? U : T[keyof T]>;
      [SOME]?: Predicate<T extends (infer U)[] ? U : T[keyof T]>;
    };

// Result types
type UpdateResult<T> = T & {
  [META]: ChangeMetadata<T>;
};

type SelectResult<T> = /* Complex type inference based on Select<T> */;

// Transaction interface
interface Transaction<T> {
  update(statement: Update<T>): Transaction<T>;
  commit(): UpdateResult<T> | undefined;
  revert(): void;
}
```

### Utility Types

```typescript
// Change metadata structure
type ChangeMetadata<T> = {
  [K in keyof T]?: {
    original: T[K];
  } & ChangeMetadata<T[K]>;
};

// Change detector type
type ChangeDetector<T> = {
  [K in keyof T]?: 
    | typeof anyChange
    | typeof typeChange
    | ((change: { value: T[K]; original: T[K] }) => boolean)
    | ChangeDetector<T[K]>;
} & {
  [ALL]?: ChangeDetector<T[keyof T]>;
};
```

## Usage Notes

### Performance Considerations
- Function transforms are called for each matching item
- DEEP_ALL recursively traverses entire structures
- WHERE predicates are evaluated for each item
- Large datasets benefit from early filtering

### Type Safety
- Full TypeScript support with type inference
- Invalid updates caught at compile time
- Optional properties can be deleted with `[]`
- Union types handled correctly

### Best Practices
1. Store change objects for undo functionality
2. Use transactions for related updates
3. Prefer predicates over functions when possible
4. Test with edge cases (null, undefined, empty)
5. Document complex operator combinations

### Common Patterns
```typescript
// Increment counter
update(data, { counter: (c) => c + 1 });

// Toggle boolean
update(data, { enabled: (e) => !e });

// Filter and update
update(data, {
  items: {
    [ALL]: {
      [WHERE]: { status: 'pending' },
      status: 'processing'
    }
  }
});

// Deep search and project
select(data, {
  [DEEP_ALL]: {
    [WHERE]: { [MATCH]: '/search term/i' },
    id: true,
    name: true
  }
});
```