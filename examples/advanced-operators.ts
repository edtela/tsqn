import { update, ALL, WHERE, DEFAULT, CONTEXT } from 'tsqn';

// Example 1: ALL operator - bulk updates
const inventory = {
  products: {
    laptop: { price: 1000, inStock: false, discount: 0 },
    mouse: { price: 50, inStock: false, discount: 0 },
    keyboard: { price: 100, inStock: false, discount: 0 }
  }
};

// Mark all products as in stock and apply 10% discount
update(inventory, {
  products: {
    [ALL]: {
      inStock: true,
      discount: 10
    }
  }
});

console.log('All products updated:', inventory);

// Example 2: WHERE operator - conditional updates
const users = {
  list: [
    { name: 'Alice', age: 25, status: 'active', category: 'regular' },
    { name: 'Bob', age: 65, status: 'active', category: 'regular' },
    { name: 'Charlie', age: 70, status: 'active', category: 'regular' }
  ]
};

// Update category for senior users
update(users, {
  list: {
    [ALL]: {
      [WHERE]: (user) => user.age >= 65,
      category: 'senior',
      discount: 15
    }
  }
});

console.log('Senior users categorized:', users.list);

// Example 3: DEFAULT operator - null field initialization
const profile: any = {
  user: {
    name: 'David',
    details: null
  }
};

// Initialize null details before updating
update(profile, {
  user: {
    details: {
      [DEFAULT]: { bio: '', location: '', website: '' },
      bio: 'Software Developer',
      location: 'San Francisco'
    }
  }
});

console.log('Profile with initialized details:', profile);

// Example 4: CONTEXT operator - passing variables
const order = {
  items: [
    { name: 'Widget A', price: 100, quantity: 2 },
    { name: 'Widget B', price: 50, quantity: 3 }
  ],
  totals: {
    subtotal: 0,
    tax: 0,
    total: 0
  }
};

// Calculate totals with tax rate from context
update(order, {
  [CONTEXT]: { taxRate: 0.08, shipping: 10 },
  items: {
    [ALL]: {
      lineTotal: (current, item) => item.price * item.quantity
    }
  },
  totals: (current, root, key, ctx) => {
    const subtotal = root.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = subtotal * ctx.taxRate;
    return {
      subtotal,
      tax,
      total: subtotal + tax + ctx.shipping
    };
  }
});

console.log('Order with calculated totals:', order);