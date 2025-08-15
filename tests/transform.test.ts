import { describe, it, expect } from 'vitest';
import { transform } from '../src/transform.js';

describe('transform functionality', () => {
  describe('AccessTransform - basic property access', () => {
    it('should access object properties by string key', () => {
      const data = { name: 'alice', age: 30 };
      
      expect(transform(data, 'name')).toBe('alice');
      expect(transform(data, 'age')).toBe(30);
    });

    it('should access array elements by numeric index', () => {
      const data = ['a', 'b', 'c'];
      
      expect(transform(data, 0)).toBe('a');
      expect(transform(data, 1)).toBe('b');
      expect(transform(data, 2)).toBe('c');
    });

    it('should return undefined for non-existent properties', () => {
      const data = { name: 'alice' };
      
      expect(transform(data, 'age')).toBeUndefined();
      expect(transform(data, 'nonexistent')).toBeUndefined();
    });

    it('should return undefined for out-of-bounds array indices', () => {
      const data = ['a', 'b'];
      
      expect(transform(data, 2)).toBeUndefined();
      expect(transform(data, -1)).toBeUndefined();
    });

    it('should access nested properties with numeric string keys', () => {
      const data = { '0': 'first', '1': 'second', '2': 'third' };
      
      expect(transform(data, '0')).toBe('first');
      expect(transform(data, '1')).toBe('second');
      expect(transform(data, '2')).toBe('third');
    });

    it('should handle null and undefined data', () => {
      expect(transform(null, 'any')).toBeUndefined();
      expect(transform(undefined, 'any')).toBeUndefined();
    });

    it('should access properties from various data types', () => {
      // Object with different value types
      const data = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        object: { nested: 'value' },
        array: [1, 2, 3]
      };
      
      expect(transform(data, 'string')).toBe('hello');
      expect(transform(data, 'number')).toBe(42);
      expect(transform(data, 'boolean')).toBe(true);
      expect(transform(data, 'null')).toBe(null);
      expect(transform(data, 'undefined')).toBe(undefined);
      expect(transform(data, 'object')).toEqual({ nested: 'value' });
      expect(transform(data, 'array')).toEqual([1, 2, 3]);
    });
  });

  describe('Array distribution', () => {
    it('should access array elements with numeric string indices', () => {
      const data = ['a', 'b', 'c'];
      
      expect(transform(data, '0')).toBe('a');
      expect(transform(data, '1')).toBe('b');
      expect(transform(data, '2')).toBe('c');
    });

    it('should distribute non-numeric string transforms across array elements', () => {
      const data = [{name: 'alice'}, {name: 'bob'}, {name: 'charlie'}];
      
      expect(transform(data, 'name')).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should handle missing properties when distributing', () => {
      const data = [{name: 'alice', age: 30}, {name: 'bob'}, {age: 25}];
      
      expect(transform(data, 'name')).toEqual(['alice', 'bob', undefined]);
      expect(transform(data, 'age')).toEqual([30, undefined, 25]);
    });

    it('should distribute string property access on string arrays', () => {
      const data = ['hello', 'world', 'test'];
      
      expect(transform(data, 'length')).toEqual([5, 5, 4]);
    });

    it('should handle mixed array with objects and primitives', () => {
      const data = [{x: 1}, 'string', 42, {x: 2}, null];
      
      expect(transform(data, 'x')).toEqual([1, undefined, undefined, 2, undefined]);
    });

    it('should not treat invalid numeric strings as array indices', () => {
      const data = [{name: 'alice'}, {name: 'bob'}];
      
      // These should distribute, not access array indices
      expect(transform(data, '02')).toEqual([undefined, undefined]); // Leading zero
      expect(transform(data, ' 2')).toEqual([undefined, undefined]); // Leading space
      expect(transform(data, '2 ')).toEqual([undefined, undefined]); // Trailing space
      expect(transform(data, '1.5')).toEqual([undefined, undefined]); // Decimal
      expect(transform(data, '-1')).toEqual([undefined, undefined]); // Negative
    });

    it('should handle array with custom properties', () => {
      const data: any = ['a', 'b', 'c'];
      data.customProp = 'custom';
      
      // Numeric string accesses element
      expect(transform(data, '0')).toBe('a');
      
      // Non-numeric string distributes (each element doesn't have 'customProp')
      expect(transform(data, 'customProp')).toEqual([undefined, undefined, undefined]);
    });

    it('should handle empty arrays', () => {
      const data: any[] = [];
      
      expect(transform(data, 'name')).toEqual([]);
      expect(transform(data, '0')).toBeUndefined();
      expect(transform(data, 0)).toBeUndefined();
    });

    it('should handle nested arrays', () => {
      const data = [[1, 2], [3, 4], [5]];
      
      expect(transform(data, '0')).toEqual([1, 2]); // Access first array
      // When distributing 'length' to nested arrays, it distributes recursively
      // Each sub-array tries to distribute 'length' to its numeric elements
      expect(transform(data, 'length')).toEqual([[undefined, undefined], [undefined, undefined], [undefined]]);
    });
  });

  describe('ChainedTransform - sequential property access', () => {
    it('should chain property accesses through nested objects', () => {
      const data = {
        user: {
          profile: {
            name: 'alice',
            age: 30
          }
        }
      };
      
      expect(transform(data, ['user', 'profile', 'name'])).toBe('alice');
      expect(transform(data, ['user', 'profile', 'age'])).toBe(30);
    });

    it('should handle array distribution in chains', () => {
      const data = {
        items: [
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' },
          { id: 3, name: 'item3' }
        ]
      };
      
      expect(transform(data, ['items', 'id'])).toEqual([1, 2, 3]);
      expect(transform(data, ['items', 'name'])).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle mixed string and numeric indices', () => {
      const data = {
        users: [
          { name: 'alice', scores: [10, 20, 30] },
          { name: 'bob', scores: [15, 25, 35] }
        ]
      };
      
      expect(transform(data, ['users', 0, 'name'])).toBe('alice');
      expect(transform(data, ['users', 1, 'scores', 2])).toBe(35);
      expect(transform(data, ['users', '0', 'scores', '1'])).toBe(20); // Numeric strings
    });

    it('should return undefined when path is invalid', () => {
      const data = { a: { b: { c: 'value' } } };
      
      expect(transform(data, ['a', 'x'])).toBeUndefined();
      expect(transform(data, ['x', 'b', 'c'])).toBeUndefined();
      expect(transform(data, ['a', 'b', 'c', 'd'])).toBeUndefined();
    });

    it('should handle null/undefined in the chain', () => {
      const data = { 
        a: null,
        b: { c: undefined },
        d: { e: { f: 'value' } }
      };
      
      expect(transform(data, ['a', 'x'])).toBeUndefined();
      expect(transform(data, ['b', 'c', 'x'])).toBeUndefined();
    });

    it('should return data unchanged for empty chain', () => {
      const data = { name: 'alice' };
      
      expect(transform(data, [])).toBe(data);
      expect(transform('string', [])).toBe('string');
      expect(transform(42, [])).toBe(42);
      expect(transform(null, [])).toBeUndefined(); // null data still returns undefined
    });

    it('should distribute through arrays at each level', () => {
      const data = [
        { items: [{ id: 1 }, { id: 2 }] },
        { items: [{ id: 3 }, { id: 4 }] }
      ];
      
      // First distributes to each object, then each gets 'items', then distributes 'id'
      expect(transform(data, ['items', 'id'])).toEqual([[1, 2], [3, 4]]);
    });

    it('should handle deeply nested chains', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value'
              }
            }
          }
        }
      };
      
      expect(transform(data, ['level1', 'level2', 'level3', 'level4', 'level5'])).toBe('deep value');
    });

    it('should reject invalid chain elements', () => {
      const data = { a: { b: 'value' } };
      
      // Arrays, objects, etc. are not valid AccessTransforms
      expect(transform(data, [['nested']])).toBeUndefined();
      expect(transform(data, [{}])).toEqual({});
      expect(transform(data, [null])).toBeUndefined();
      expect(transform(data, ['a', {}])).toEqual({});
    });

    it('should handle arrays with numeric string indices correctly in chains', () => {
      const data = {
        matrix: [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
          ['g', 'h', 'i']
        ]
      };
      
      expect(transform(data, ['matrix', '1', '2'])).toBe('f');
      expect(transform(data, ['matrix', 1, 2])).toBe('f');
      // 'length' distributes to each element of the array ['a', 'b', 'c']
      expect(transform(data, ['matrix', '0', 'length'])).toEqual([1, 1, 1]);
    });
  });

  describe('SelectTransform - object-based selection and transformation', () => {
    it('should select specific properties with true', () => {
      const data = { a: 1, b: 2, c: 3, d: 4 };
      
      expect(transform(data, { a: true, c: true })).toEqual({ a: 1, c: 3 });
      expect(transform(data, { b: true })).toEqual({ b: 2 });
    });

    it('should skip properties with false', () => {
      const data = { a: 1, b: 2, c: 3 };
      
      expect(transform(data, { a: true, b: false, c: true })).toEqual({ a: 1, c: 3 });
    });

    it('should apply transforms to selected properties', () => {
      const data = { 
        user: { name: 'alice', age: 30 },
        items: [1, 2, 3],
        count: 5
      };
      
      // Use AccessTransform to select nested properties
      expect(transform(data, { 
        userName: ['user', 'name'],
        itemCount: ['items', 'length'],
        count: true
      })).toEqual({ 
        userName: 'alice',
        itemCount: [undefined, undefined, undefined], // 'length' distributes to array elements
        count: 5
      });
    });

    it('should handle nested SelectTransforms', () => {
      const data = {
        user: { 
          profile: { name: 'alice', age: 30, email: 'alice@example.com' },
          settings: { theme: 'dark', notifications: true }
        }
      };
      
      expect(transform(data, {
        user: {
          profile: { name: true, age: true },
          settings: { theme: true }
        }
      })).toEqual({
        user: {
          profile: { name: 'alice', age: 30 },
          settings: { theme: 'dark' }
        }
      });
    });

    it('should combine SelectTransform with AccessTransform', () => {
      const data = {
        a: { b: { c: 'deep' } },
        x: 10,
        y: 20
      };
      
      expect(transform(data, {
        deepValue: ['a', 'b', 'c'],
        sum: 'x'  // Just access x
      })).toEqual({
        deepValue: 'deep',
        sum: 10
      });
    });

    it('should handle undefined values in SelectTransform', () => {
      const data = { a: 1, b: undefined, c: null };
      
      expect(transform(data, {
        a: true,
        b: true,  // undefined values are skipped
        c: true,
        d: true   // non-existent keys are skipped
      })).toEqual({
        a: 1,
        c: null
      });
    });

    it('should work with arrays in SelectTransform', () => {
      const data = {
        items: [
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' }
        ]
      };
      
      expect(transform(data, {
        ids: ['items', 'id'],
        firstItem: ['items', 0],
        items: true
      })).toEqual({
        ids: [1, 2],
        firstItem: { id: 1, name: 'item1' },
        items: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }]
      });
    });

    it('should handle empty SelectTransform', () => {
      const data = { a: 1, b: 2 };
      
      expect(transform(data, {})).toEqual({});
    });

    it('should apply SelectTransform within a chain', () => {
      const data = {
        users: [
          { profile: { name: 'alice', age: 30 } },
          { profile: { name: 'bob', age: 25 } }
        ]
      };
      
      // Chain to users, then apply SelectTransform
      expect(transform(data, ['users', { 
        profile: { name: true } 
      }])).toEqual([
        { profile: { name: 'alice' } },
        { profile: { name: 'bob' } }
      ]);
    });

    it('should handle complex nested transforms', () => {
      const data = {
        company: {
          employees: [
            { name: 'alice', department: 'eng', salary: 100000 },
            { name: 'bob', department: 'sales', salary: 80000 }
          ],
          departments: ['eng', 'sales', 'hr']
        }
      };
      
      expect(transform(data, {
        employeeNames: ['company', 'employees', 'name'],
        firstEmployee: ['company', 'employees', 0, { name: true, department: true }],
        departmentCount: ['company', 'departments', 'length']
      })).toEqual({
        employeeNames: ['alice', 'bob'],
        firstEmployee: { name: 'alice', department: 'eng' },
        departmentCount: [3, 5, 2] // lengths of 'eng', 'sales', 'hr'
      });
    });
  });
});