# Deep Selection Guide (DEEP_ALL)

The DEEP_ALL operator enables recursive searching and selection of data at any depth in your data structure. It's particularly powerful for finding and extracting nested data without knowing the exact path.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Field Projection](#field-projection)
- [WHERE Filtering](#where-filtering)
- [Fuzzy Matching Behavior](#fuzzy-matching-behavior)
- [Common Patterns](#common-patterns)
- [Pitfalls and Solutions](#pitfalls-and-solutions)

## Core Concepts

DEEP_ALL recursively traverses your data structure and:
1. **Without WHERE**: Projects specified fields from any depth
2. **With WHERE only**: Returns objects matching the predicate
3. **With WHERE and fields**: Filters objects and projects fields

```typescript
import { select, DEEP_ALL } from 'tsqn';

// The general pattern
select(data, {
  [DEEP_ALL]: {
    [WHERE]: predicate,  // Optional: filter condition
    field1: true,        // Optional: fields to select
    field2: true
  }
});
```

## Basic Usage

### Finding Fields at Any Depth

```typescript
const data = {
  company: {
    id: 'C1',
    departments: {
      engineering: {
        id: 'D1',
        teams: {
          frontend: { id: 'T1', name: 'Frontend Team' },
          backend: { id: 'T2', name: 'Backend Team' }
        }
      },
      sales: {
        id: 'D2',
        teams: {
          enterprise: { id: 'T3', name: 'Enterprise Sales' }
        }
      }
    }
  }
};

// Find all 'id' fields at any depth
const ids = select(data, {
  [DEEP_ALL]: { id: true }
});
// Result: {
//   company: {
//     id: 'C1',
//     departments: {
//       engineering: {
//         id: 'D1',
//         teams: {
//           frontend: { id: 'T1' },
//           backend: { id: 'T2' }
//         }
//       },
//       sales: {
//         id: 'D2',
//         teams: {
//           enterprise: { id: 'T3' }
//         }
//       }
//     }
//   }
// }
```

## Field Projection

### Independent Field Selection

Fields are selected independently - an object doesn't need all specified fields:

```typescript
const data = {
  users: {
    john: { name: 'John', age: 30 },
    jane: { name: 'Jane', email: 'jane@example.com' },
    bob: { age: 25, email: 'bob@example.com' }
  }
};

// Select name and email wherever they exist
const result = select(data, {
  [DEEP_ALL]: { name: true, email: true }
});
// Result: {
//   users: {
//     john: { name: 'John' },
//     jane: { name: 'Jane', email: 'jane@example.com' },
//     bob: { email: 'bob@example.com' }
//   }
// }
```

### Nested Object Projection

You can project entire nested structures:

```typescript
const data = {
  locations: {
    office1: {
      address: {
        street: '123 Main St',
        city: 'New York',
        zip: '10001'
      }
    },
    office2: {
      address: {
        street: '456 Oak Ave',
        city: 'San Francisco',
        zip: '94102'
      }
    }
  }
};

// Select all address objects
const addresses = select(data, {
  [DEEP_ALL]: { address: true }
});
// Result: {
//   locations: {
//     office1: {
//       address: {
//         street: '123 Main St',
//         city: 'New York',
//         zip: '10001'
//       }
//     },
//     office2: {
//       address: {
//         street: '456 Oak Ave',
//         city: 'San Francisco',
//         zip: '94102'
//       }
//     }
//   }
// }
```

## WHERE Filtering

### Object-Level Filtering

```typescript
import { select, DEEP_ALL, WHERE, GT, MATCH } from 'tsqn';

const catalog = {
  electronics: {
    laptops: {
      macbook: { brand: 'Apple', price: 2000, stock: 5 },
      thinkpad: { brand: 'Lenovo', price: 1500, stock: 10 }
    },
    phones: {
      iphone: { brand: 'Apple', price: 1000, stock: 20 },
      galaxy: { brand: 'Samsung', price: 900, stock: 15 }
    }
  }
};

// Find all Apple products
const appleProducts = select(catalog, {
  [DEEP_ALL]: {
    [WHERE]: { brand: 'Apple' }
  }
});
// Returns the full matching objects

// Find expensive items and project specific fields
const expensive = select(catalog, {
  [DEEP_ALL]: {
    [WHERE]: { price: { [GT]: 1500 } },
    brand: true,
    price: true,
    stock: true
  }
});
```

### Primitive-Level Filtering

MATCH operator at the WHERE level matches primitive values:

```typescript
const data = {
  products: {
    item1: { name: 'Orange Juice', description: 'Fresh' },
    item2: { name: 'Apple Juice', description: 'Organic apples' },
    item3: { name: 'Grape Juice', description: 'Sweet' }
  }
};

// Match any string field containing 'orange' (case insensitive)
const orangeItems = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { [MATCH]: '/orange/i' }
  }
});
// Matches item1 (name contains 'Orange')

// Match specific field with pattern
const organicItems = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { description: { [MATCH]: '/organic/i' } }
  }
});
// Matches item2 (description contains 'organic')
```

## Fuzzy Matching Behavior

**⚠️ Important**: DEEP_ALL matches at ANY depth, including parent objects that might not have the fields being tested.

### The Challenge

```typescript
const data = {
  root: {           // root has no 'value' field (undefined)
    child: {
      value: null   // child.value is explicitly null
    }
  }
};

// This matches BOTH root and child!
const result = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { value: { [EQ]: null } }  // undefined == null is true
  }
});
```

### Solutions

#### 1. Add Discriminating Fields

```typescript
const data = {
  records: {
    r1: { id: 1, value: null },
    r2: { id: 2, value: undefined },
    r3: { id: 3, value: 'data' },
    r4: { id: 4 }  // No value field
  }
};

// Add id constraint to only match actual records
const nullValues = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { 
      value: { [EQ]: null },
      id: { [NEQ]: null }  // Ensures we only match objects with an id
    },
    id: true
  }
});
// Only matches r1, r2, and r4 (not the parent objects)
```

#### 2. Exclude Null/Undefined Explicitly

```typescript
const data = {
  users: {
    u1: { name: 'Alice', status: 'active' },
    u2: { name: 'Bob', status: 'inactive' },
    u3: { name: 'Charlie', status: 'active' }
  }
};

// Exclude both 'inactive' AND null/undefined
const activeUsers = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { 
      status: { [NOT]: ['inactive', { [EQ]: null }] }
    },
    name: true
  }
});
// Only matches u1 and u3, not parent objects
```

## Common Patterns

### Finding Objects with Required Fields

```typescript
const data = {
  items: {
    a: { price: 10, stock: 5 },
    b: { price: 20 },           // No stock
    c: { stock: 10 },            // No price
    d: { price: 30, stock: 0 }
  }
};

// Find objects that have both price AND stock fields
const complete = select(data, {
  [DEEP_ALL]: {
    [WHERE]: {
      price: { [NOT]: undefined },
      stock: { [NOT]: undefined }
    }
  }
});
// Matches only 'a' and 'd'
```

### Multi-Level Search

```typescript
const data = {
  store: {
    name: 'Orange Store',
    products: {
      juice: { name: 'Orange Juice', price: 5 },
      tea: { name: 'Green Tea', price: 3 }
    }
  }
};

// Matches at multiple levels
const orangeMatches = select(data, {
  [DEEP_ALL]: {
    [WHERE]: { [MATCH]: '/orange/i' },
    name: true,
    price: true
  }
});
// Matches both store (name: 'Orange Store') and juice (name: 'Orange Juice')
```

### Combining with Regular Selection

```typescript
const data = {
  metadata: { version: '1.0', author: 'System' },
  stores: {
    downtown: {
      inventory: {
        electronics: { count: 50, value: 10000 },
        books: { count: 200, value: 5000 }
      }
    },
    uptown: {
      inventory: {
        electronics: { count: 30, value: 15000 }
      }
    }
  }
};

// Combine regular selection with DEEP_ALL
const result = select(data, {
  metadata: true,  // Regular selection
  stores: {
    [DEEP_ALL]: {   // Deep selection within stores
      [WHERE]: { value: { [GT]: 9000 } },
      count: true,
      value: true
    }
  }
});
```

### Nested DEEP_ALL

```typescript
const data = {
  regions: {
    north: {
      stores: {
        s1: { manager: { name: 'Alice', level: 3 } },
        s2: { manager: { name: 'Bob', level: 2 } }
      }
    },
    south: {
      stores: {
        s3: { manager: { name: 'Charlie', level: 3 } }
      }
    }
  }
};

// First DEEP_ALL finds stores, second finds managers
const seniorManagers = select(data, {
  [DEEP_ALL]: {
    stores: {
      [DEEP_ALL]: {
        [WHERE]: { level: { [GT]: 2 } },
        name: true
      }
    }
  }
});
```

## Pitfalls and Solutions

### Arrays vs Objects

DEEP_ALL works with both arrays and objects:

```typescript
const data = {
  items: [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' }
  ]
};

// Works correctly with arrays
const result = select(data, {
  [DEEP_ALL]: { id: true }
});
// Result: { items: [{ id: 1 }, { id: 2 }] }
```

### Primitive Values

DEEP_ALL doesn't traverse into primitive values:

```typescript
const data = {
  text: 'This string contains id',
  number: 12345,
  object: { id: 'real-id' }
};

const result = select(data, {
  [DEEP_ALL]: { id: true }
});
// Result: { object: { id: 'real-id' } }
// The string and number are ignored
```

### Performance Considerations

```typescript
// For very deep structures, consider limiting depth manually
function selectWithMaxDepth(data: any, maxDepth: number) {
  if (maxDepth <= 0) return undefined;
  
  return select(data, {
    [DEEP_ALL]: {
      // Your selection here
    }
  });
}

// Or use specific paths when known
const specific = select(data, {
  level1: {
    level2: {
      level3: {
        target: true
      }
    }
  }
});
// More efficient than DEEP_ALL for known paths
```

### Empty Results

```typescript
const data = {
  a: {},
  b: { c: {} }
};

// No matching fields returns undefined
const result = select(data, {
  [DEEP_ALL]: { id: true }
});
// Result: undefined (no 'id' fields found)
```

## Best Practices

1. **Be specific with WHERE clauses** to avoid matching unintended parent objects
2. **Add discriminator fields** when using `[EQ]: null` to distinguish actual data from missing fields
3. **Use field projection** to limit returned data size
4. **Combine with regular selection** for known paths to improve performance
5. **Test with representative data** including edge cases like empty objects and arrays
6. **Consider performance** for very large or deeply nested structures
7. **Document fuzzy matching** behavior in your code when it might be non-obvious
8. **Use TypeScript** to catch potential issues at compile time