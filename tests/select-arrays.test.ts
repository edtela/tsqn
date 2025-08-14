import { describe, it, expect } from 'vitest';
import { select, ALL, WHERE } from '../src/index.js';

describe('select with arrays', () => {
  it('should select from array of objects with ALL and WHERE', () => {
    const data = {
      items: [
        { id: 1, name: 'Apple', price: 3 },
        { id: 2, name: 'Banana', price: 7 },
        { id: 3, name: 'Orange', price: 6 }
      ]
    };

    const result = select(data, {
      items: {
        [ALL]: {
          [WHERE]: (item) => item.price > 5,
          id: true,
          price: true
        }
      }
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    // The WHERE applies to each item, and we select id and price
    // But the result should be a sparse array maintaining original indices
    expect(result).toEqual({
      items: [
        undefined,
        { id: 2, price: 7 },
        { id: 3, price: 6 }
      ]
    });
  });

  it('should handle tuple-like selection with specific indices', () => {
    type Tuple = [string, number, boolean];
    const data: { tuple: Tuple } = {
      tuple: ['hello', 42, true]
    };

    const result = select(data, {
      tuple: {
        '0': true,
        '2': true
      }
    });

    // Sparse array preserves tuple positions
    expect(result).toEqual({
      tuple: ['hello', undefined, true]
    });
  });

  it('should ignore non-numeric keys in array selection', () => {
    const data = {
      arr: [1, 2, 3]
    };

    const result = select(data, {
      arr: {
        '1': true,
        'invalid': true,  // Should be ignored
        'abc': true       // Should be ignored
      } as any
    });

    expect(result).toEqual({
      arr: [undefined, 2, undefined]
    });
  });
});