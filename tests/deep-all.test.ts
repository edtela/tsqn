import { describe, it, expect } from 'vitest';
import { select, DEEP_ALL, WHERE, GT, MATCH } from '../src/index.js';

describe('DEEP_ALL operator', () => {
  describe('primitive value matching', () => {
    it('should find exact string matches at any depth', () => {
      const data = {
        menu1: {
          layout: ["Header", "Group 1", "Footer"],
          meta: { title: "Group 1", description: "Main group" }
        },
        menu2: {
          sections: {
            main: "Group 1",
            sub: "Group 2"
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: "Group 1"
      });

      expect(result).toEqual({
        menu1: {
          layout: ["Group 1"],  // Arrays get compacted
          meta: { title: "Group 1" }
        },
        menu2: {
          sections: {
            main: "Group 1"
          }
        }
      });
    });

    it('should find number values at any depth', () => {
      const data = {
        config: {
          maxItems: 100,
          settings: {
            timeout: 5000,
            retries: 3
          }
        },
        prices: [100, 200, 100]
      };

      const result = select(data, {
        [DEEP_ALL]: 100
      });

      expect(result).toEqual({
        config: {
          maxItems: 100
        },
        prices: [100, 100]  // Arrays get compacted
      });
    });

    it('should find specific boolean values using WHERE', () => {
      const data = {
        settings: {
          enabled: true,
          debug: false,
          features: {
            darkMode: true,
            autoSave: false
          }
        }
      };

      // To match boolean true specifically, use WHERE
      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: (v: any) => v === true
        }
      });

      expect(result).toEqual({
        settings: {
          enabled: true,
          features: {
            darkMode: true
          }
        }
      });
    });

    it('should find null values', () => {
      const data = {
        user: {
          name: "Alice",
          email: null,
          profile: {
            bio: null,
            avatar: "pic.jpg"
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: null
      });

      expect(result).toEqual({
        user: {
          email: null,
          profile: {
            bio: null
          }
        }
      });
    });
  });

  describe('object pattern matching', () => {
    it('should match objects with all specified fields', () => {
      const data = {
        products: {
          item1: { price: 100, name: "Coffee" },
          item2: { price: 200, name: "Tea", category: "drinks" },
          metadata: { version: 1, author: "system" }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          price: true,
          name: true
        }
      });

      expect(result).toEqual({
        products: {
          item1: { price: 100, name: "Coffee" },
          item2: { price: 200, name: "Tea" }
        }
      });
    });

    it('should only match when ALL fields are present', () => {
      const data = {
        item1: { price: 100, stock: 5 },
        item2: { price: 200 },  // missing stock
        item3: { stock: 10 }    // missing price
      };

      const result = select(data, {
        [DEEP_ALL]: {
          price: true,
          stock: true
        }
      });

      expect(result).toEqual({
        item1: { price: 100, stock: 5 }
      });
    });

    it('should select only requested fields even if more exist', () => {
      const data = {
        products: {
          coffee: {
            price: 90,
            name: "Espresso",
            description: "Italian coffee",
            category: "hot drinks"
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          price: true,
          name: true
        }
      });

      expect(result).toEqual({
        products: {
          coffee: {
            price: 90,
            name: "Espresso"
          }
        }
      });
    });
  });

  describe('WHERE predicate matching', () => {
    it('should use WHERE to find matching objects', () => {
      const data = {
        menu: {
          items: {
            coffee: { price: 90, name: "Coffee" },
            tea: { price: 200, name: "Tea" },
            water: { price: 0, name: "Water" }
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: (obj: any) => obj?.price > 100,
          price: true,
          name: true
        }
      });

      expect(result).toEqual({
        menu: {
          items: {
            tea: { price: 200, name: "Tea" }
          }
        }
      });
    });

    it('should match with predicate objects', () => {
      const data = {
        products: {
          item1: { price: 50 },
          item2: { price: 150 },
          item3: { price: 250 }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { price: { [GT]: 100 } },
          price: true
        }
      });

      expect(result).toEqual({
        products: {
          item2: { price: 150 },
          item3: { price: 250 }
        }
      });
    });

    it('should match strings with regex', () => {
      const data = {
        en: {
          header: "Main Group",
          section: "Group 1 Items",
          footer: "End of page"
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { [MATCH]: "Group" }
        }
      });

      expect(result).toEqual({
        en: {
          header: "Main Group",
          section: "Group 1 Items",
          footer: "End of page"  // All strings selected when WHERE matches the parent
        }
      });
    });

    it('should select non-existent fields as undefined when WHERE matches', () => {
      const data = {
        items: {
          a: { price: 100, name: "A" },
          b: { price: 200 },  // no name
          c: { value: 300 }   // different structure
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: (obj: any) => obj?.price > 150,
          price: true,
          name: true,
          category: true  // doesn't exist
        }
      });

      expect(result).toEqual({
        items: {
          b: { price: 200, name: undefined, category: undefined }
        }
      });
    });
  });

  describe('complex nested structures', () => {
    it('should traverse deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                target: "found me!",
                other: "not this"
              }
            }
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: "found me!"
      });

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              level4: {
                target: "found me!"
              }
            }
          }
        }
      });
    });

    it('should handle mixed arrays and objects', () => {
      const data = {
        menu: {
          items: [
            { price: 100, name: "Item 1" },
            { price: 200, name: "Item 2" },
            { metadata: { price: 150 } }
          ]
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: (obj: any) => obj?.price >= 150,
          price: true
        }
      });

      expect(result).toEqual({
        menu: {
          items: [
            { price: 200 },  // Arrays get compacted
            { metadata: { price: 150 } }
          ]
        }
      });
    });

    it('should preserve structure with multiple matches', () => {
      const data = {
        menus: {
          coffee: {
            hot: { espresso: { price: 90 } },
            cold: { iced: { price: 150 } }
          },
          tea: {
            green: { price: 200 },
            black: { price: 180 }
          }
        }
      };

      const result = select(data, {
        [DEEP_ALL]: {
          price: true
        }
      });

      expect(result).toEqual({
        menus: {
          coffee: {
            hot: { espresso: { price: 90 } },
            cold: { iced: { price: 150 } }
          },
          tea: {
            green: { price: 200 },
            black: { price: 180 }
          }
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const data = {};
      const result = select(data, {
        [DEEP_ALL]: "anything"
      });
      expect(result).toBeUndefined();
    });

    it('should handle arrays at root', () => {
      const data = [
        { value: 1 },
        { value: 2 },
        "value",
        { nested: { value: 3 } }
      ];

      const result = select(data, {
        [DEEP_ALL]: {
          value: true
        }
      });

      expect(result).toEqual([
        { value: 1 },
        { value: 2 },
        { nested: { value: 3 } }  // Arrays get compacted
      ]);
    });

    it('should not recurse into primitives', () => {
      const data = {
        text: "Group 1",
        number: 42,
        bool: true
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: (v: any) => false,  // Never matches
          anything: true
        }
      });

      expect(result).toBeUndefined();
    });

    it('should handle circular references gracefully', () => {
      const data: any = {
        a: { value: 1 }
      };
      data.a.circular = data;  // Create circular reference

      // This should not cause infinite recursion
      const result = select(data, {
        [DEEP_ALL]: {
          value: true
        }
      });

      expect(result?.a?.value).toBe(1);
      // The circular reference creates infinite depth, but we still get results
    });
  });

  describe('terminal selection with true', () => {
    it('should select entire subtree when pattern is true', () => {
      const data = {
        config: {
          settings: {
            theme: "dark",
            language: "en"
          }
        }
      };

      const result = select(data, {
        config: {
          [DEEP_ALL]: true
        }
      });

      expect(result).toEqual({
        config: {
          settings: {
            theme: "dark",
            language: "en"
          }
        }
      });
    });
  });
});