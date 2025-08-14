import { update, undoUpdate, META } from 'tsqn';

// Basic property updates
const data = {
  user: {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com'
  },
  settings: {
    theme: 'dark',
    notifications: true
  }
};

console.log('Initial data:', data);

// Simple update
const changes = update(data, {
  user: {
    age: 31,
    email: 'alice@newdomain.com'
  },
  settings: {
    theme: 'light'
  }
});

console.log('After update:', data);
console.log('Changes tracked:', JSON.stringify(changes, null, 2));

// Function-based updates
update(data, {
  user: {
    name: (current) => current.toUpperCase(),
    age: (current) => current + 1
  }
});

console.log('After function updates:', data);

// Undo changes
undoUpdate(data, changes);
console.log('After undo:', data);