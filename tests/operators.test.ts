import { describe, it, expect } from 'vitest';
import { update, ALL, WHERE, DEFAULT, CONTEXT, META } from '../src/index.js';

describe('operators', () => {
  describe('ALL operator', () => {
    it('should update all properties in an object', () => {
      const data = {
        items: {
          item1: { price: 10, inStock: false },
          item2: { price: 20, inStock: false },
          item3: { price: 30, inStock: false }
        }
      };

      const changes = update(data, {
        items: {
          [ALL]: { inStock: true }
        }
      });

      expect(data.items.item1.inStock).toBe(true);
      expect(data.items.item2.inStock).toBe(true);
      expect(data.items.item3.inStock).toBe(true);
    });

    it('should update all array elements', () => {
      const data = {
        products: [
          { name: 'Product 1', discount: 0 },
          { name: 'Product 2', discount: 0 }
        ]
      };

      const changes = update(data, {
        products: {
          [ALL]: { discount: 10 }
        }
      });

      expect(data.products[0].discount).toBe(10);
      expect(data.products[1].discount).toBe(10);
    });

    it('should apply function to all properties', () => {
      const data = {
        scores: {
          alice: 100,
          bob: 200,
          charlie: 150
        }
      };

      const changes = update(data, {
        scores: {
          [ALL]: (current: number) => current * 1.1
        }
      });

      expect(data.scores.alice).toBeCloseTo(110, 10);
      expect(data.scores.bob).toBeCloseTo(220, 10);
      expect(data.scores.charlie).toBeCloseTo(165, 10);
    });
  });

  describe('WHERE operator', () => {
    it('should conditionally update based on predicate', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30, status: 'active' },
          { name: 'Bob', age: 65, status: 'active' },
          { name: 'Charlie', age: 70, status: 'active' }
        ]
      };

      const changes = update(data, {
        users: {
          [ALL]: {
            [WHERE]: (user: any) => user.age >= 65,
            status: 'senior'
          }
        }
      });

      expect(data.users[0].status).toBe('active');
      expect(data.users[1].status).toBe('senior');
      expect(data.users[2].status).toBe('senior');
    });

    it('should skip update when WHERE returns false', () => {
      const data = {
        config: { mode: 'production', debug: false }
      };

      const changes = update(data, {
        config: {
          [WHERE]: (cfg: any) => cfg.mode === 'development',
          debug: true
        }
      });

      expect(data.config.debug).toBe(false);
      expect(changes).toBeUndefined();
    });
  });

  describe('DEFAULT operator', () => {
    it('should initialize null field with DEFAULT before update', () => {
      const data: any = {
        user: { profile: null }
      };

      const changes = update(data, {
        user: {
          profile: {
            [DEFAULT]: { name: '', bio: '', avatar: '' },
            name: 'Alice',
            bio: 'Developer'
          }
        }
      });

      expect(data.user.profile).toEqual({
        name: 'Alice',
        bio: 'Developer',
        avatar: ''
      });

      expect(changes).toEqual({
        user: {
          profile: {
            name: 'Alice',
            bio: 'Developer',
            avatar: ''
          },
          [META]: {
            profile: { original: null }
          }
        }
      });
    });

    it('should work with arrays', () => {
      const data: any = {
        cart: { items: null }
      };

      const changes = update(data, {
        cart: {
          items: {
            [DEFAULT]: [],
            "0": [{ id: 'item1', quantity: 2 }]
          }
        }
      });

      expect(data.cart.items).toEqual([{ id: 'item1', quantity: 2 }]);
    });

    it('should not use DEFAULT when field is not null', () => {
      const data = {
        user: {
          profile: { name: 'Bob', bio: 'Existing' }
        }
      };

      const changes = update(data, {
        user: {
          profile: {
            [DEFAULT]: { name: '', bio: '', avatar: '' },
            bio: 'Updated'
          }
        }
      });

      expect(data.user.profile).toEqual({
        name: 'Bob',
        bio: 'Updated'
      });
    });
  });

  describe('CONTEXT operator', () => {
    it('should pass context variables to functions', () => {
      const data = {
        items: [
          { price: 100 },
          { price: 200 }
        ]
      };

      const changes = update(data, {
        [CONTEXT]: { taxRate: 0.08, discount: 0.1 },
        items: {
          [ALL]: {
            finalPrice: (current: any, item: any, key: string, ctx: any) =>
              item.price * (1 - ctx.discount) * (1 + ctx.taxRate)
          }
        }
      });

      expect(data.items[0]).toHaveProperty('finalPrice');
      expect(data.items[0].finalPrice).toBeCloseTo(97.2, 1);
      expect(data.items[1].finalPrice).toBeCloseTo(194.4, 1);
    });

    it('should allow context override at nested levels', () => {
      const data = {
        regular: { price: 100 },
        special: { price: 100 }
      };

      const changes = update(data, {
        [CONTEXT]: { multiplier: 1.0 },
        regular: {
          price: (current: number, item: any, key: string, ctx: any) => current * ctx.multiplier
        },
        special: {
          [CONTEXT]: { multiplier: 1.5 },
          price: (current: number, item: any, key: string, ctx: any) => current * ctx.multiplier
        }
      });

      expect(data.regular.price).toBe(100);
      expect(data.special.price).toBe(150);
    });

    it('should pass context through WHERE predicates', () => {
      const data = {
        items: [
          { value: 50 },
          { value: 150 }
        ]
      };

      const changes = update(data, {
        [CONTEXT]: { threshold: 100 },
        items: {
          [ALL]: {
            [WHERE]: (item: any, ctx: any) => item.value >= ctx.threshold,
            marked: true
          }
        }
      });

      expect(data.items[0]).not.toHaveProperty('marked');
      expect(data.items[1]).toHaveProperty('marked');
      expect(data.items[1].marked).toBe(true);
    });
  });
});