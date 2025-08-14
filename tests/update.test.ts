import { describe, it, expect } from 'vitest';
import { update, undo, META } from '../src/index.js';

describe('update functionality', () => {
  describe('direct value updates', () => {
    it('should update simple properties', () => {
      const data = {
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark' }
      };

      const changes = update(data, {
        user: { age: 31 },
        settings: { theme: 'light' }
      });

      expect(changes).toEqual({
        user: { age: 31, [META]: { age: { original: 30 } } },
        settings: { theme: 'light', [META]: { theme: { original: 'dark' } } }
      });
      expect(data.user.age).toBe(31);
      expect(data.settings.theme).toBe('light');
    });

    it('should return undefined when no changes occur', () => {
      const data = {
        user: { name: 'Alice', age: 30 }
      };

      const changes = update(data, {
        user: { age: 30 } // Same value
      });

      expect(changes).toBeUndefined();
    });

    it('should handle nested updates', () => {
      const data = {
        app: {
          ui: { theme: 'dark', fontSize: 14 },
          features: { autoSave: true }
        }
      };

      const changes = update(data, {
        app: {
          ui: { theme: 'light' }
        }
      });

      expect(changes).toEqual({
        app: {
          ui: { theme: 'light', [META]: { theme: { original: 'dark' } } }
        }
      });
      expect(data.app.ui.theme).toBe('light');
      expect(data.app.ui.fontSize).toBe(14); // Unchanged
    });
  });

  describe('function updates', () => {
    it('should apply function transforms', () => {
      const data = {
        user: { name: 'alice', score: 100 }
      };

      const changes = update(data, {
        user: {
          name: (current: string) => current.toUpperCase(),
          score: (current: number) => current * 2
        }
      });

      expect(changes).toEqual({
        user: { 
          name: 'ALICE', 
          score: 200,
          [META]: { 
            name: { original: 'alice' }, 
            score: { original: 100 } 
          }
        }
      });
      expect(data.user.name).toBe('ALICE');
      expect(data.user.score).toBe(200);
    });

    it('should handle functions that return nested updates', () => {
      const data = {
        counter: { value: 5, metadata: { lastUpdate: 0 } }
      };

      const now = Date.now();
      const changes = update(data, {
        counter: (current) => ({
          value: current.value + 1,
          metadata: { lastUpdate: now }
        })
      });

      expect(data.counter.value).toBe(6);
      expect(data.counter.metadata.lastUpdate).toBe(now);
    });
  });

  describe('array replacement operator []', () => {
    it('should replace entire value with [value]', () => {
      const data = {
        user: { name: 'Alice', age: 30, city: 'NYC' }
      };

      const changes = update(data, {
        user: [{ name: 'Bob', age: 25 }]
      });

      expect(data.user).toEqual({ name: 'Bob', age: 25 });
      expect(changes).toEqual({
        user: { name: 'Bob', age: 25 },
        [META]: { user: { original: { name: 'Alice', age: 30, city: 'NYC' } } }
      });
    });

    it('should delete optional property with empty []', () => {
      const data: { user: { name: string; nickname?: string } } = {
        user: { name: 'Alice', nickname: 'Ali' }
      };

      const changes = update(data, {
        user: { nickname: [] }
      });

      expect(data.user).toEqual({ name: 'Alice' });
      expect('nickname' in data.user).toBe(false);
    });

    it('should handle array element replacement', () => {
      const data = {
        items: [
          { id: 1, name: 'Item 1', quantity: 5 },
          { id: 2, name: 'Item 2', quantity: 10 }
        ]
      };

      const changes = update(data, {
        items: {
          "0": [{ id: 1, name: 'Updated Item', quantity: 3 }]
        }
      });

      expect(data.items[0]).toEqual({ id: 1, name: 'Updated Item', quantity: 3 });
    });
  });

  describe('undo functionality', () => {
    it('should undo simple changes', () => {
      const data = {
        user: { name: 'Alice', age: 30 }
      };

      const changes = update(data, {
        user: { age: 31 }
      });

      expect(data.user.age).toBe(31);

      undo(data, changes);
      expect(data.user.age).toBe(30);
    });

    it('should undo nested changes', () => {
      const data = {
        app: {
          settings: {
            theme: 'dark',
            fontSize: 14
          }
        }
      };

      const changes = update(data, {
        app: {
          settings: {
            theme: 'light',
            fontSize: 16
          }
        }
      });

      expect(data.app.settings.theme).toBe('light');
      expect(data.app.settings.fontSize).toBe(16);

      undo(data, changes);
      expect(data.app.settings.theme).toBe('dark');
      expect(data.app.settings.fontSize).toBe(14);
    });
  });
});