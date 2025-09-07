import { describe, it, expect } from 'vitest';
import { select, ALL, WHERE } from '../src/index.js';

describe('select', () => {
  describe('basic object selection', () => {
    it('should select simple properties', () => {
      const data = {
        name: 'Alice',
        age: 30,
        email: 'alice@example.com'
      };

      const result = select(data, {
        name: true,
        age: true
      });

      expect(result).toEqual({
        name: 'Alice',
        age: 30
      });
    });

    it('should select nested properties', () => {
      const data = {
        user: {
          name: 'Bob',
          profile: {
            bio: 'Developer',
            location: 'NYC'
          }
        },
        settings: {
          theme: 'dark'
        }
      };

      const result = select(data, {
        user: {
          name: true,
          profile: {
            bio: true
          }
        }
      });

      expect(result).toEqual({
        user: {
          name: 'Bob',
          profile: {
            bio: 'Developer'
          }
        }
      });
    });

    it('should return undefined for non-existent properties', () => {
      const data = { name: 'Alice' };
      
      const result = select(data, {
        email: true
      } as any);

      expect(result).toEqual({ email: undefined });
    });

    it('should handle null and undefined data', () => {
      // Selecting fields from primitives (including null/undefined) returns undefined
      expect(select(null, { any: true } as any)).toBeUndefined();
      expect(select(undefined, { any: true } as any)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      const data = { value: 42 };
      
      const result = select(data, {
        value: true
      });

      expect(result).toEqual({ value: 42 });
    });
  });

  describe('object with ALL operator', () => {
    it('should select all properties with ALL: true', () => {
      const data = {
        a: 1,
        b: 2,
        c: 3
      };

      const result = select(data, {
        [ALL]: true
      });

      expect(result).toEqual(data);
    });

    it('should apply nested selection to all properties', () => {
      const data = {
        user1: { name: 'Alice', age: 30, email: 'alice@test.com' },
        user2: { name: 'Bob', age: 25, email: 'bob@test.com' },
        user3: { name: 'Charlie', age: 35, email: 'charlie@test.com' }
      };

      const result = select(data, {
        [ALL]: {
          name: true,
          age: true
        }
      });

      expect(result).toEqual({
        user1: { name: 'Alice', age: 30 },
        user2: { name: 'Bob', age: 25 },
        user3: { name: 'Charlie', age: 35 }
      });
    });

    it('should combine ALL with specific selections', () => {
      const data = {
        a: { value: 1, extra: 'a' },
        b: { value: 2, extra: 'b' },
        c: { value: 3, extra: 'c' }
      };

      const result = select(data, {
        [ALL]: {
          value: true
        },
        b: {
          extra: true
        }
      });

      // ALL and specific selections merge - both value and extra are selected for 'b'
      expect(result).toEqual({
        a: { value: 1 },
        b: { value: 2, extra: 'b' },  // Specific expands ALL selection
        c: { value: 3 }
      });
    });
  });

  describe('object with WHERE operator', () => {
    it('should filter entire object with WHERE', () => {
      const data = {
        count: 5,
        name: 'Test'
      };

      const result1 = select(data, {
        [WHERE]: (obj) => obj.count > 3,
        name: true
      });
      expect(result1).toEqual({ name: 'Test' });

      const result2 = select(data, {
        [WHERE]: (obj) => obj.count > 10,
        name: true
      });
      expect(result2).toBeUndefined();
    });

    it('should apply WHERE in nested selections', () => {
      const data = {
        items: {
          item1: { price: 10, name: 'Item 1' },
          item2: { price: 5, name: 'Item 2' }
        }
      };

      const result = select(data, {
        items: {
          item1: {
            [WHERE]: (item) => item.price > 8,
            name: true
          },
          item2: {
            [WHERE]: (item) => item.price > 8,
            name: true
          }
        }
      });

      expect(result).toEqual({
        items: {
          item1: { name: 'Item 1' }
          // item2 filtered out
        }
      });
    });
  });

  describe('arrays with direct index selection', () => {
    it('should select specific indices creating sparse array', () => {
      const data = ['a', 'b', 'c', 'd', 'e'];

      const result = select(data, {
        '0': true,
        '2': true,
        '4': true
      });

      expect(result).toEqual(['a', undefined, 'c', undefined, 'e']);
    });

    it('should handle tuple-like selection', () => {
      const data: [string, number, boolean] = ['hello', 42, true];

      const result = select(data, {
        '0': true,
        '2': true
      });

      expect(result).toEqual(['hello', undefined, true]);
    });

    it('should select nested properties in array elements', () => {
      const data = [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
        { id: 3, name: 'Charlie', role: 'user' }
      ];

      const result = select(data, {
        '0': { id: true, name: true },
        '2': { name: true, role: true }
      });

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        undefined,
        { name: 'Charlie', role: 'user' }
      ]);
    });

    it('should ignore non-numeric keys for arrays', () => {
      const data = [1, 2, 3];

      const result = select(data, {
        '1': true,
        'invalid': true,
        'abc': true,
        '-1': true,
        '1.5': true
      } as any);

      expect(result).toEqual([undefined, 2]);
    });

    it('should handle out-of-bounds indices', () => {
      const data = [1, 2, 3];

      const result = select(data, {
        '1': true,
        '10': true
      });

      // Sparse array with index 10 creates 11 slots
      const expected = [undefined, 2];
      expected[10] = undefined;
      expect(result).toEqual(expected);
    });
  });

  describe('arrays with ALL operator', () => {
    it('should select all elements with ALL: true', () => {
      const data = [1, 2, 3, 4, 5];

      const result = select(data, {
        [ALL]: true
      });

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should apply nested selection to all elements', () => {
      const data = [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
        { id: 3, name: 'Charlie', age: 35 }
      ];

      const result = select(data, {
        [ALL]: {
          id: true,
          name: true
        }
      });

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]);
    });

    it('should combine ALL with specific index selections', () => {
      const data = [
        { value: 1, extra: 'a' },
        { value: 2, extra: 'b' },
        { value: 3, extra: 'c' }
      ];

      const result = select(data, {
        [ALL]: { value: true },
        '1': { extra: true }
      });

      // ALL and specific selections merge - both value and extra are selected for index 1
      expect(result).toEqual([
        { value: 1 },
        { value: 2, extra: 'b' },  // Index 1 has both value (from ALL) and extra (from specific)
        { value: 3 }
      ]);
    });
  });

  describe('arrays with WHERE in nested selections', () => {
    it('should filter elements with WHERE inside ALL', () => {
      const data = [
        { id: 1, price: 3 },
        { id: 2, price: 7 },
        { id: 3, price: 5 },
        { id: 4, price: 9 }
      ];

      const result = select(data, {
        [ALL]: {
          [WHERE]: (item) => item.price > 5,
          id: true,
          price: true
        }
      });

      // WHERE filters elements, ALL creates dense array
      expect(result).toEqual([
        { id: 2, price: 7 },
        { id: 4, price: 9 }
      ]);
    });

    it('should handle nested arrays', () => {
      const data = {
        categories: [
          {
            name: 'Electronics',
            items: [
              { id: 1, name: 'Phone', price: 500 },
              { id: 2, name: 'Laptop', price: 1000 }
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

      const result = select(data, {
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

      expect(result).toEqual({
        categories: [
          {
            name: 'Electronics',
            items: [
              { name: 'Phone', price: 500 },
              { name: 'Laptop', price: 1000 }
            ]
          },
          {
            name: 'Books',
            items: [
              { name: 'Textbook', price: 80 }
            ]
          }
        ]
      });
    });
  });

  describe('Record types', () => {
    it('should allow any string key for Record types', () => {
      const data: Record<string, { value: number; label: string }> = {
        'key1': { value: 1, label: 'First' },
        'key2': { value: 2, label: 'Second' },
        'dynamic-key': { value: 3, label: 'Third' }
      };

      const result = select(data, {
        'key1': { value: true },
        'dynamic-key': { label: true },
        'non-existent': true
      });

      expect(result).toEqual({
        'key1': { value: 1 },
        'dynamic-key': { label: 'Third' }
      });
    });

    it('should work with ALL on Record types', () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3
      };

      const result = select(data, {
        [ALL]: true
      });

      expect(result).toEqual(data);
    });

    it('should handle nested Record types', () => {
      const data: Record<string, Record<string, number>> = {
        group1: { a: 1, b: 2 },
        group2: { c: 3, d: 4 }
      };

      const result = select(data, {
        group1: {
          a: true
        },
        group2: {
          [ALL]: true
        }
      });

      expect(result).toEqual({
        group1: { a: 1 },
        group2: { c: 3, d: 4 }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const data = {};
      const result = select(data, { any: true } as any);
      expect(result).toEqual({ any: undefined });
    });

    it('should handle empty arrays', () => {
      const data: any[] = [];
      const result = select(data, { '0': true });
      expect(result).toEqual([undefined]);
    });

    it('should handle deeply nested structures', () => {
      const data = {
        a: {
          b: {
            c: {
              d: {
                value: 'deep'
              }
            }
          }
        }
      };

      const result = select(data, {
        a: {
          b: {
            c: {
              d: {
                value: true
              }
            }
          }
        }
      });

      expect(result).toEqual(data);
    });

    it('should handle mixed arrays and objects', () => {
      const data = {
        users: [
          { name: 'Alice', tags: ['admin', 'user'] },
          { name: 'Bob', tags: ['user'] }
        ],
        config: {
          settings: ['setting1', 'setting2']
        }
      };

      const result = select(data, {
        users: {
          [ALL]: {
            name: true,
            tags: {
              '0': true
            }
          }
        },
        config: true
      });

      expect(result).toEqual({
        users: [
          { name: 'Alice', tags: ['admin'] },
          { name: 'Bob', tags: ['user'] }
        ],
        config: {
          settings: ['setting1', 'setting2']
        }
      });
    });

    it('should handle selecting false boolean values', () => {
      const data = {
        flag: false,
        value: 0,
        text: ''
      };

      const result = select(data, {
        flag: true,
        value: true,
        text: true
      });

      expect(result).toEqual(data);
    });
  });
});