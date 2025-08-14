import { describe, it, expect } from 'vitest';
import { selectByPath, ALL } from '../src/index.js';

describe('selectByPath', () => {
  it('should select simple property by path', () => {
    const data = {
      user: { name: 'Alice', age: 30 },
      settings: { theme: 'dark' }
    };

    const result = selectByPath(data, ['user', 'name']);
    expect(result).toEqual({ user: { name: 'Alice' } });
  });

  it('should select nested property', () => {
    const data = {
      app: {
        config: {
          database: {
            host: 'localhost',
            port: 5432
          }
        }
      }
    };

    const result = selectByPath(data, ['app', 'config', 'database', 'host']);
    expect(result).toEqual({
      app: {
        config: {
          database: {
            host: 'localhost'
          }
        }
      }
    });
  });

  it('should select with ALL symbol', () => {
    const data = {
      items: {
        item1: { price: 10, name: 'Item 1' },
        item2: { price: 20, name: 'Item 2' },
        item3: { price: 30, name: 'Item 3' }
      }
    };

    const result = selectByPath(data, ['items', ALL, 'price']);
    expect(result).toEqual({
      items: {
        item1: { price: 10 },
        item2: { price: 20 },
        item3: { price: 30 }
      }
    });
  });

  it('should return undefined for non-existent path', () => {
    const data = {
      user: { name: 'Alice' }
    };

    const result = selectByPath(data, ['user', 'email']);
    expect(result).toBeUndefined();
  });

  it('should return data for empty path', () => {
    const data = { value: 42 };
    const result = selectByPath(data, []);
    expect(result).toBe(data);
  });

  it('should handle null data', () => {
    const result = selectByPath(null, ['any', 'path']);
    expect(result).toBe(null);
  });

  it('should handle arrays as terminal nodes', () => {
    const data = {
      list: [1, 2, 3]
    };

    const result = selectByPath(data, ['list']);
    expect(result).toEqual({ list: [1, 2, 3] });
  });
});