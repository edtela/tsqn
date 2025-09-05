import { describe, it, expect } from 'vitest';
import { select, WHERE, GT, LT, EQ, GTE, LTE, NEQ } from '../src/index.js';

describe('select with primitive predicates', () => {
  describe('primitive-level WHERE vs object-level WHERE', () => {
    it('should filter primitive fields with WHERE at field level', () => {
      const data = {
        price: 10,
        quantity: 5,
        name: 'Widget'
      };

      // Primitive-level WHERE - only select price if > 5
      const result = select(data, {
        price: { [WHERE]: { [GT]: 5 } },
        quantity: true,
        name: true
      });

      expect(result).toEqual({
        price: 10,
        quantity: 5,
        name: 'Widget'
      });
    });

    it('should exclude primitive fields when WHERE predicate fails', () => {
      const data = {
        price: 3,
        quantity: 5,
        name: 'Widget'
      };

      // Price won't be selected because 3 is not > 5
      const result = select(data, {
        price: { [WHERE]: { [GT]: 5 } },
        quantity: true,
        name: true
      });

      expect(result).toEqual({
        quantity: 5,
        name: 'Widget'
      });
    });

    it('should handle multiple primitive predicates', () => {
      const data = {
        price: 10,
        discount: 2,
        tax: 15,
        shipping: 3
      };

      const result = select(data, {
        price: { [WHERE]: { [GT]: 5 } },      // 10 > 5 ✓
        discount: { [WHERE]: { [LT]: 5 } },   // 2 < 5 ✓
        tax: { [WHERE]: { [GT]: 20 } },       // 15 > 20 ✗
        shipping: { [WHERE]: { [LTE]: 3 } }   // 3 <= 3 ✓
      });

      expect(result).toEqual({
        price: 10,
        discount: 2,
        shipping: 3
        // tax is excluded
      });
    });

    it('should work with function predicates on primitives', () => {
      const data = {
        score: 85,
        bonus: 10,
        penalty: 5
      };

      const result = select(data, {
        score: { [WHERE]: (v: number) => v >= 80 },
        bonus: { [WHERE]: (v: number) => v % 2 === 0 },
        penalty: { [WHERE]: (v: number) => v > 10 }
      });

      expect(result).toEqual({
        score: 85,
        bonus: 10
        // penalty excluded because 5 > 10 is false
      });
    });
  });

  describe('comparison with object-level WHERE', () => {
    it('should behave differently from object-level WHERE', () => {
      const data = {
        price: 10,
        quantity: 5
      };

      // Object-level WHERE filters the entire object
      const objectLevel = select(data, {
        price: true,
        quantity: true,
        [WHERE]: { price: { [GT]: 5 } }
      });

      // Primitive-level WHERE filters individual fields
      const primitiveLevel = select(data, {
        price: { [WHERE]: { [GT]: 5 } },
        quantity: { [WHERE]: { [GT]: 5 } }
      });

      expect(objectLevel).toEqual({
        price: 10,
        quantity: 5
      });

      expect(primitiveLevel).toEqual({
        price: 10
        // quantity excluded because 5 > 5 is false
      });
    });

    it('should combine object-level and primitive-level WHERE', () => {
      const data = {
        price: 10,
        quantity: 2,
        inStock: true
      };

      // Object must have price > 5, then individually select fields
      const result = select(data, {
        price: { [WHERE]: { [GTE]: 10 } },  // 10 >= 10 ✓
        quantity: { [WHERE]: { [GT]: 3 } },  // 2 > 3 ✗
        inStock: true,
        [WHERE]: { price: { [GT]: 5 } }     // Object filter: price > 5 ✓
      });

      expect(result).toEqual({
        price: 10,
        inStock: true
        // quantity excluded by primitive-level WHERE
      });
    });
  });

  describe('various predicate operators', () => {
    it('should work with EQ predicate', () => {
      const data = { value: 42, other: 10 };
      
      const result = select(data, {
        value: { [WHERE]: { [EQ]: 42 } },
        other: { [WHERE]: { [EQ]: 42 } }
      });

      expect(result).toEqual({ value: 42 });
    });

    it('should work with NEQ predicate', () => {
      const data = { a: 1, b: 2, c: 3 };
      
      const result = select(data, {
        a: { [WHERE]: { [NEQ]: 2 } },
        b: { [WHERE]: { [NEQ]: 2 } },
        c: { [WHERE]: { [NEQ]: 2 } }
      });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should work with complex function predicates', () => {
      const data = { 
        status: 'active',
        role: 'admin',
        level: 'user'
      };
      
      const result = select(data, {
        status: { [WHERE]: (v: string) => ['active', 'pending'].includes(v) },
        role: { [WHERE]: (v: string) => ['admin', 'moderator'].includes(v) },
        level: { [WHERE]: (v: string) => ['admin', 'moderator'].includes(v) }
      });

      expect(result).toEqual({ 
        status: 'active',
        role: 'admin'
      });
    });

    it('should work with negation using function predicates', () => {
      const data = { 
        a: 1,
        b: 2,
        c: 3,
        d: 4
      };
      
      const result = select(data, {
        a: { [WHERE]: (v: number) => ![2, 3, 4].includes(v) },
        b: { [WHERE]: (v: number) => ![2, 3, 4].includes(v) },
        c: { [WHERE]: (v: number) => ![5, 6, 7].includes(v) },
        d: { [WHERE]: (v: number) => ![1, 2, 3].includes(v) }
      });

      expect(result).toEqual({ 
        a: 1,
        c: 3,
        d: 4
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const data = {
        value: null,
        other: 10
      };

      const result = select(data, {
        value: { [WHERE]: { [EQ]: null } },
        other: { [WHERE]: { [EQ]: null } }
      });

      expect(result).toEqual({ value: null });
    });

    it('should handle undefined values', () => {
      const data = {
        value: undefined,
        other: 10
      } as any;

      const result = select(data, {
        value: { [WHERE]: { [EQ]: undefined } },
        other: { [WHERE]: { [EQ]: undefined } }
      });

      expect(result).toEqual({ value: undefined });
    });

    it('should handle boolean primitives', () => {
      const data = {
        isActive: true,
        isDeleted: false,
        isPending: true
      };

      const result = select(data, {
        isActive: { [WHERE]: { [EQ]: true } },
        isDeleted: { [WHERE]: { [EQ]: true } },
        isPending: { [WHERE]: { [NEQ]: false } }
      });

      expect(result).toEqual({
        isActive: true,
        isPending: true
      });
    });

    it('should handle string primitives with predicates', () => {
      const data = {
        name: 'Alice',
        role: 'admin',
        status: 'active'
      };

      const result = select(data, {
        name: { [WHERE]: (v: string) => v.startsWith('A') },
        role: { [WHERE]: (v: string) => ['admin', 'moderator'].includes(v) },
        status: { [WHERE]: { [EQ]: 'inactive' } }
      });

      expect(result).toEqual({
        name: 'Alice',
        role: 'admin'
      });
    });
  });

  describe('nested objects with primitive predicates', () => {
    it('should apply primitive predicates in nested structures', () => {
      const data = {
        user: {
          age: 25,
          score: 95,
          level: 3
        },
        stats: {
          views: 1000,
          likes: 50
        }
      };

      const result = select(data, {
        user: {
          age: { [WHERE]: { [GTE]: 18 } },
          score: { [WHERE]: { [GT]: 90 } },
          level: { [WHERE]: { [GT]: 5 } }
        },
        stats: {
          views: { [WHERE]: { [GT]: 500 } },
          likes: true
        }
      });

      expect(result).toEqual({
        user: {
          age: 25,
          score: 95
          // level excluded
        },
        stats: {
          views: 1000,
          likes: 50
        }
      });
    });
  });
});