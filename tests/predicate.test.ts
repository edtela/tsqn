import { describe, it, expect } from 'vitest';
import { 
  evalPredicate,
  LT, GT, LTE, GTE, EQ, NEQ, NOT, MATCH, SOME, ALL
} from '../src/index.js';

describe('predicate', () => {
  describe('terminal predicates', () => {
    describe('numbers', () => {
      it('should handle direct equality', () => {
        expect(evalPredicate(5, 5)).toBe(true);
        expect(evalPredicate(5, 10)).toBe(false);
      });

      it('should handle comparison operators', () => {
        expect(evalPredicate(5, { [GT]: 3 })).toBe(true);
        expect(evalPredicate(5, { [GT]: 5 })).toBe(false);
        expect(evalPredicate(5, { [GT]: 7 })).toBe(false);
        
        expect(evalPredicate(5, { [GTE]: 3 })).toBe(true);
        expect(evalPredicate(5, { [GTE]: 5 })).toBe(true);
        expect(evalPredicate(5, { [GTE]: 7 })).toBe(false);
        
        expect(evalPredicate(5, { [LT]: 7 })).toBe(true);
        expect(evalPredicate(5, { [LT]: 5 })).toBe(false);
        expect(evalPredicate(5, { [LT]: 3 })).toBe(false);
        
        expect(evalPredicate(5, { [LTE]: 7 })).toBe(true);
        expect(evalPredicate(5, { [LTE]: 5 })).toBe(true);
        expect(evalPredicate(5, { [LTE]: 3 })).toBe(false);
      });

      it('should handle EQ and NEQ operators', () => {
        expect(evalPredicate(5, { [EQ]: 5 })).toBe(true);
        expect(evalPredicate(5, { [EQ]: null })).toBe(false);
        expect(evalPredicate(null, { [EQ]: null })).toBe(true);
        expect(evalPredicate(undefined, { [EQ]: null })).toBe(true); // == null
        
        expect(evalPredicate(5, { [NEQ]: null })).toBe(true);
        expect(evalPredicate(null, { [NEQ]: null })).toBe(false);
        expect(evalPredicate(undefined, { [NEQ]: null })).toBe(false); // != null
      });

      it('should handle NOT operator', () => {
        expect(evalPredicate(5, { [NOT]: 3 })).toBe(true);
        expect(evalPredicate(5, { [NOT]: 5 })).toBe(false);
        expect(evalPredicate(null, { [NOT]: null })).toBe(false);
        expect(evalPredicate(undefined, { [NOT]: null })).toBe(true); // !== null
      });
    });

    describe('strings', () => {
      it('should handle direct equality', () => {
        expect(evalPredicate('hello', 'hello')).toBe(true);
        expect(evalPredicate('hello', 'world')).toBe(false);
      });

      it('should handle comparison operators', () => {
        expect(evalPredicate('b', { [GT]: 'a' })).toBe(true);
        expect(evalPredicate('b', { [GTE]: 'b' })).toBe(true);
        expect(evalPredicate('a', { [LT]: 'b' })).toBe(true);
        expect(evalPredicate('b', { [LTE]: 'b' })).toBe(true);
      });

      it('should handle MATCH operator', () => {
        expect(evalPredicate('hello@example.com', { [MATCH]: '.*@.*\\.com' })).toBe(true);
        expect(evalPredicate('hello@example.org', { [MATCH]: '.*@.*\\.com' })).toBe(false);
        expect(evalPredicate('admin_user', { [MATCH]: '^admin' })).toBe(true);
        expect(evalPredicate('user_admin', { [MATCH]: '^admin' })).toBe(false);
      });
    });

    describe('booleans', () => {
      it('should handle direct equality', () => {
        expect(evalPredicate(true, true)).toBe(true);
        expect(evalPredicate(true, false)).toBe(false);
        expect(evalPredicate(false, false)).toBe(true);
      });

      it('should handle NOT operator', () => {
        expect(evalPredicate(true, { [NOT]: false })).toBe(true);
        expect(evalPredicate(true, { [NOT]: true })).toBe(false);
      });
    });

    describe('null and undefined', () => {
      it('should handle direct equality', () => {
        expect(evalPredicate(null, null)).toBe(true);
        expect(evalPredicate(undefined, undefined)).toBe(true);
        expect(evalPredicate(null, undefined)).toBe(false);
        expect(evalPredicate(undefined, null)).toBe(false);
      });

      it('should handle EQ operator', () => {
        expect(evalPredicate(null, { [EQ]: null })).toBe(true);
        expect(evalPredicate(undefined, { [EQ]: null })).toBe(true);
        expect(evalPredicate(0, { [EQ]: null })).toBe(false);
      });

      it('should handle NEQ operator', () => {
        expect(evalPredicate(null, { [NEQ]: null })).toBe(false);
        expect(evalPredicate(undefined, { [NEQ]: null })).toBe(false);
        expect(evalPredicate(0, { [NEQ]: null })).toBe(true);
      });
    });
  });

  describe('OR predicates (arrays)', () => {
    it('should handle empty OR as FALSE', () => {
      expect(evalPredicate(5, [])).toBe(false);
      expect(evalPredicate({ a: 1 }, [])).toBe(false);
    });

    it('should handle OR with primitives', () => {
      expect(evalPredicate(5, [3, 5, 7])).toBe(true);
      expect(evalPredicate(6, [3, 5, 7])).toBe(false);
      expect(evalPredicate('apple', ['apple', 'banana', 'orange'])).toBe(true);
      expect(evalPredicate('grape', ['apple', 'banana', 'orange'])).toBe(false);
    });

    it('should handle OR with operators', () => {
      expect(evalPredicate(5, [{ [GT]: 10 }, { [LT]: 3 }, { [EQ]: 5 }])).toBe(true);
      expect(evalPredicate(5, [{ [GT]: 10 }, { [LT]: 3 }])).toBe(false);
    });

    it('should handle OR with mixed types', () => {
      const value: string | number = 5;
      const pred = [
        { [MATCH]: '^admin' },  // For strings
        { [GT]: 3 }              // For numbers
      ];
      expect(evalPredicate(value, pred)).toBe(true);

      const value2: string | number = 'admin_user';
      expect(evalPredicate(value2, pred)).toBe(true);

      const value3: string | number = 'user';
      expect(evalPredicate(value3, pred)).toBe(false);

      const value4: string | number = 2;
      expect(evalPredicate(value4, pred)).toBe(false);
    });
  });

  describe('AND predicates (objects)', () => {
    it('should handle empty AND as TRUE', () => {
      expect(evalPredicate(5, {})).toBe(true);
      expect(evalPredicate({ a: 1 }, {})).toBe(true);
    });

    it('should handle object predicates with specific properties', () => {
      const data = { name: 'Alice', age: 30, status: 'active' };
      
      expect(evalPredicate(data, { name: 'Alice' })).toBe(true);
      expect(evalPredicate(data, { name: 'Bob' })).toBe(false);
      
      expect(evalPredicate(data, { 
        name: 'Alice',
        age: { [GTE]: 18 }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        name: 'Alice',
        age: { [GT]: 40 }
      })).toBe(false);
    });

    it('should handle missing properties', () => {
      const data = { name: 'Alice' };
      
      // Missing property compared to undefined
      expect(evalPredicate(data, { 
        email: { [EQ]: null }  // undefined == null
      })).toBe(true);
      
      expect(evalPredicate(data, {
        email: { [NEQ]: null }  // undefined != null is false
      })).toBe(false);
    });
  });

  describe('NOT operator', () => {
    it('should handle NOT at object level', () => {
      const data = { name: 'Alice', age: 30 };
      
      expect(evalPredicate(data, {
        [NOT]: { name: 'Bob' }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        [NOT]: { name: 'Alice' }
      })).toBe(false);
      
      expect(evalPredicate(data, {
        [NOT]: {
          name: 'Alice',
          age: { [GT]: 40 }
        }
      })).toBe(true); // NOT (Alice AND age > 40)
    });

    it('should handle NOT with OR', () => {
      const data = { status: 'active' };
      
      expect(evalPredicate(data, {
        [NOT]: [
          { status: 'deleted' },
          { status: 'archived' }
        ]
      })).toBe(true); // NOT (deleted OR archived)
      
      expect(evalPredicate(data, {
        [NOT]: [
          { status: 'active' },
          { status: 'pending' }
        ]
      })).toBe(false);
    });
  });

  describe('ALL operator', () => {
    it('should handle ALL in arrays', () => {
      const data = [2, 4, 6, 8];
      
      expect(evalPredicate(data, {
        [ALL]: { [GT]: 0 }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        [ALL]: { [GT]: 5 }
      })).toBe(false);
      
      // ALL with modulo check (even numbers)
      expect(evalPredicate([2, 4, 6], {
        [ALL]: [2, 4, 6, 8, 10]  // All must be in this set
      })).toBe(true);
    });

    it('should handle ALL in objects', () => {
      const data = {
        score1: 85,
        score2: 90,
        score3: 88
      };
      
      expect(evalPredicate(data, {
        [ALL]: { [GTE]: 80 }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        [ALL]: { [GTE]: 90 }
      })).toBe(false);
    });

    it('should combine ALL with specific properties', () => {
      const data = {
        required: 100,
        optional1: 50,
        optional2: 60
      };
      
      expect(evalPredicate(data, {
        required: { [GTE]: 100 },
        [ALL]: { [GTE]: 40 }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        required: { [GTE]: 100 },
        [ALL]: { [GTE]: 60 }
      })).toBe(false);
    });
  });

  describe('SOME operator', () => {
    it('should handle SOME in arrays', () => {
      const data = [1, 3, 5, 7, 9];
      
      expect(evalPredicate(data, {
        [SOME]: { [GT]: 5 }
      })).toBe(true); // 7 and 9 are > 5
      
      expect(evalPredicate(data, {
        [SOME]: { [GT]: 10 }
      })).toBe(false); // None are > 10
    });

    it('should handle SOME in objects', () => {
      const data = {
        score1: 45,
        score2: 55,
        score3: 35
      };
      
      expect(evalPredicate(data, {
        [SOME]: { [GTE]: 50 }
      })).toBe(true); // score2 >= 50
      
      expect(evalPredicate(data, {
        [SOME]: { [GTE]: 60 }
      })).toBe(false); // None >= 60
    });

    it('should handle SOME with complex predicates', () => {
      const data = [
        { name: 'Alice', role: 'admin', age: 30 },
        { name: 'Bob', role: 'user', age: 25 },
        { name: 'Charlie', role: 'user', age: 35 }
      ];
      
      expect(evalPredicate(data, {
        [SOME]: { role: 'admin' }
      })).toBe(true);
      
      expect(evalPredicate(data, {
        [SOME]: {
          role: 'user',
          age: { [GT]: 30 }
        }
      })).toBe(true); // Charlie matches
      
      expect(evalPredicate(data, {
        [SOME]: {
          role: 'admin',
          age: { [GT]: 40 }
        }
      })).toBe(false); // No admin over 40
    });
  });

  describe('complex nested predicates', () => {
    it('should handle deeply nested structures', () => {
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
      
      expect(evalPredicate(data, {
        user: {
          profile: {
            name: 'Alice',
            age: { [GTE]: 18 },
            settings: {
              theme: ['dark', 'auto']
            }
          }
        }
      })).toBe(true);
    });

    it('should handle arrays of objects', () => {
      const data = {
        orders: [
          { id: 1, total: 100, status: 'paid' },
          { id: 2, total: 200, status: 'pending' },
          { id: 3, total: 50, status: 'paid' }
        ]
      };
      
      expect(evalPredicate(data, {
        orders: {
          [ALL]: [
            { status: 'paid' },
            { total: { [GTE]: 150 } }
          ]
        }
      })).toBe(true); // All orders match at least one condition (paid OR >= 150)

      // Test where ALL with OR fails
      expect(evalPredicate(data, {
        orders: {
          [ALL]: [
            { status: 'shipped' },
            { total: { [GTE]: 300 } }
          ]
        }
      })).toBe(false); // No order is shipped and no order >= 300
      
      expect(evalPredicate(data, {
        orders: {
          [SOME]: {
            status: 'paid',
            total: { [GTE]: 75 }
          }
        }
      })).toBe(true); // Order 1 matches
    });
  });

  describe('special cases', () => {
    it('should handle type mismatches gracefully', () => {
      // String predicate on number - should be false
      expect(evalPredicate(5, { [MATCH]: 'test' })).toBe(false);
      
      // Number predicate on string - should be false
      expect(evalPredicate('hello', { [GT]: 5 })).toBe(false);
    });

    it('should handle mixed type unions', () => {
      const pred = [
        { [GT]: 10 },         // For numbers
        { [MATCH]: '^admin' } // For strings
      ];
      
      // Boolean value - neither predicate applies
      expect(evalPredicate(true, pred)).toBe(false);
    });

    it('should handle empty arrays and objects', () => {
      expect(evalPredicate([], {
        [ALL]: { [GT]: 0 }
      })).toBe(true); // Vacuously true
      
      expect(evalPredicate([], {
        [SOME]: { [GT]: 0 }
      })).toBe(false); // No elements to match
      
      expect(evalPredicate({}, {
        [ALL]: { [GT]: 0 }
      })).toBe(true); // Vacuously true
      
      expect(evalPredicate({}, {
        [SOME]: { [GT]: 0 }
      })).toBe(false); // No properties to match
    });
  });
});