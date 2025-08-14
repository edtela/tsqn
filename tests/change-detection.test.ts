import { describe, it, expect } from 'vitest';
import { update, hasChanges, anyChange, typeChange, ALL, META } from '../src/index.js';

describe('change detection', () => {
  describe('hasChanges', () => {
    it('should detect changes with anyChange detector', () => {
      const data = {
        user: { name: 'Alice', age: 30 }
      };

      const changes = update(data, {
        user: { age: 31 }
      });

      const hasUserAgeChange = hasChanges(changes, {
        user: {
          age: anyChange
        }
      });

      expect(hasUserAgeChange).toBe(true);

      const hasUserNameChange = hasChanges(changes, {
        user: {
          name: anyChange
        }
      });

      expect(hasUserNameChange).toBe(false);
    });

    it('should detect changes with nested detectors', () => {
      const data = {
        app: {
          config: {
            theme: 'dark',
            fontSize: 14
          }
        }
      };

      const changes = update(data, {
        app: {
          config: {
            theme: 'light'
          }
        }
      });

      const hasThemeChange = hasChanges(changes, {
        app: {
          config: {
            theme: anyChange
          }
        }
      });

      expect(hasThemeChange).toBe(true);
    });

    it('should use ALL detector for multiple properties', () => {
      const data = {
        items: {
          item1: { price: 10 },
          item2: { price: 20 },
          item3: { price: 30 }
        }
      };

      const changes = update(data, {
        items: {
          item2: { price: 25 }
        }
      });

      const hasAnyItemChange = hasChanges(changes, {
        items: {
          [ALL]: {
            price: anyChange
          }
        }
      });

      expect(hasAnyItemChange).toBe(true);
    });
  });

  describe('anyChange detector', () => {
    it('should return true when property exists in changes', () => {
      const changes = {
        user: { name: 'Bob', [META]: { name: { original: 'Alice' } } }
      };

      expect(anyChange('user', changes)).toBe(true);
      expect(anyChange('settings', changes)).toBe(false);
    });
  });

  describe('typeChange detector', () => {
    it('should detect type changes', () => {
      const data: any = {
        value: 'string'
      };

      const changes = update(data, {
        value: 123
      });

      expect(typeChange('value', changes)).toBe(true);
    });

    it('should detect null to non-null changes', () => {
      const data: any = {
        value: null
      };

      const changes = update(data, {
        value: 'not null'
      });

      expect(typeChange('value', changes)).toBe(true);
    });

    it('should return false for same type changes', () => {
      const data = {
        value: 'hello'
      };

      const changes = update(data, {
        value: 'world'
      });

      expect(typeChange('value', changes)).toBe(false);
    });

    it('should return false when no META information', () => {
      const changes = {
        value: 'new'
      };

      expect(typeChange('value', changes)).toBe(false);
    });
  });
});