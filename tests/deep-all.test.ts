import { describe, it, expect } from "vitest";
import { select, DEEP_ALL, WHERE, GT, LT, EQ, NEQ, MATCH, NOT } from "../src/index.js";

/**
 * DEEP_ALL operator tests
 * 
 * IMPORTANT: DEEP_ALL has "fuzzy" matching behavior - it matches at ANY depth in the tree,
 * including parent objects that might not have the fields being tested.
 * 
 * For example, when checking { value: { [EQ]: null } }:
 * - It will match objects where value is explicitly null or undefined
 * - It will ALSO match objects where the value field is missing (undefined)
 * - This includes parent objects in the tree that don't have a value field at all
 * 
 * To avoid unintended matches, predicates often need to be more specific by:
 * - Adding additional field constraints (e.g., id: { [NEQ]: null })
 * - Using arrays with NOT to exclude multiple values (e.g., [NOT]: ["inactive", { [EQ]: null }])
 */
describe("DEEP_ALL operator - new semantics", () => {
  describe("field projection without WHERE", () => {
    it("should independently project fields from any depth", () => {
      const data = {
        a: {
          id: "A1",
          name: "Item A",
          b: {
            id: "B1",
            c: {
              id: "C1",
              name: "Item C",
            },
          },
        },
        d: {
          id: "D1",
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { id: true },
      });

      expect(result).toEqual({
        a: {
          id: "A1",
          b: {
            id: "B1",
            c: {
              id: "C1",
            },
          },
        },
        d: {
          id: "D1",
        },
      });
    });

    it("should project multiple fields independently", () => {
      const data = {
        users: {
          john: { name: "John", age: 30 },
          jane: { name: "Jane", email: "jane@example.com" },
          bob: { age: 25, email: "bob@example.com" },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { name: true, email: true },
      });

      expect(result).toEqual({
        users: {
          john: { name: "John" },
          jane: { name: "Jane", email: "jane@example.com" },
          bob: { email: "bob@example.com" },
        },
      });
    });

    it("should handle nested field projection", () => {
      const data = {
        company: {
          info: {
            name: "TechCorp",
            address: {
              street: "123 Main St",
              city: "San Francisco",
            },
          },
          departments: {
            engineering: {
              address: {
                building: "A",
                floor: 3,
              },
            },
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { address: true },
      });

      expect(result).toEqual({
        company: {
          info: {
            address: {
              street: "123 Main St",
              city: "San Francisco",
            },
          },
          departments: {
            engineering: {
              address: {
                building: "A",
                floor: 3,
              },
            },
          },
        },
      });
    });
  });

  describe("WHERE-only selection", () => {
    it("should return matching objects at any depth", () => {
      const data = {
        catalog: {
          books: {
            fiction: {
              title: "The Great Novel",
              author: "Jane Doe",
              price: 20,
            },
            science: {
              title: "Physics 101",
              author: "Dr. Smith",
              price: 50,
            },
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { [WHERE]: { price: { [GT]: 30 } } },
      });

      expect(result).toEqual({
        catalog: {
          books: {
            science: {
              title: "Physics 101",
              author: "Dr. Smith",
              price: 50,
            },
          },
        },
      });
    });

    it("should match objects with specific field values", () => {
      const data = {
        level1: {
          id: "L1",
          level2: {
            name: "Orange Juice",
            price: 100,
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { [WHERE]: { name: { [EQ]: "Orange Juice" } } },
      });

      expect(result).toEqual({
        level1: {
          level2: {
            name: "Orange Juice",
            price: 100,
          },
        },
      });
    });

    it("should match using MATCH operator for pattern matching on primitives", () => {
      const data = {
        products: {
          item1: { name: "Coffee", description: "Dark roast" },
          item2: { name: "Orange Tea", description: "Citrus blend" },
          item3: { name: "Green Tea", description: "Light and fresh" },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { [WHERE]: { [MATCH]: "/orange/i" } },
      });

      // MATCH at this level matches primitive string values
      expect(result).toEqual({
        products: {
          item2: {
            name: "Orange Tea",
          },
        },
      });
    });

    it("should match objects when using field-level predicates", () => {
      const data = {
        products: {
          item1: { name: "Coffee", description: "Dark roast" },
          item2: { name: "Orange Tea", description: "Citrus blend" },
          item3: { name: "Green Tea", description: "Light and fresh" },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: { [WHERE]: { name: { [MATCH]: "/orange/i" } } },
      });

      // When matching at object level with field predicate, return full object
      expect(result).toEqual({
        products: {
          item2: {
            name: "Orange Tea",
            description: "Citrus blend",
          },
        },
      });
    });
  });

  describe("WHERE with field projection", () => {
    it("should match and project specified fields", () => {
      const data = {
        products: {
          item1: { name: "Coffee", price: 5, stock: 100 },
          item2: { name: "Orange Tea", price: 8, stock: 50 },
          item3: { name: "Green Tea", price: 6, stock: 75 },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { [MATCH]: "Orange" },
          price: true,
          stock: true,
        },
      });

      expect(result).toEqual({
        products: {
          item2: {
            name: "Orange Tea",
            price: 8,
            stock: 50,
          },
        },
      });
    });

    it("should project fields from parent when match is deep", () => {
      const data = {
        product: {
          id: "P123",
          sku: "ABC-789",
          details: {
            name: "Fresh Orange Juice",
            description: "100% natural",
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { [MATCH]: "Orange" },
          id: true,
          sku: true,
        },
      });

      expect(result).toEqual({
        product: {
          details: {
            name: "Fresh Orange Juice",
          },
          id: "P123",
          sku: "ABC-789",
        },
      });
    });

    it("should handle multiple matches at different depths", () => {
      const data = {
        store: {
          name: "Orange Store",
          id: "S1",
          location: "Downtown",
          products: {
            juice: {
              name: "Orange Juice",
              id: "P1",
              price: 5,
            },
            tea: {
              name: "Green Tea",
              id: "P2",
              price: 3,
            },
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { [MATCH]: "Orange" },
          id: true,
          location: true,
        },
      });

      expect(result).toEqual({
        store: {
          name: "Orange Store",
          id: "S1",
          location: "Downtown",
          products: {
            juice: {
              name: "Orange Juice",
              id: "P1",
            },
          },
        },
      });
    });

    it("should project fields that exist only at matched level", () => {
      const data = {
        catalog: {
          books: {
            item1: { title: "Learn TypeScript", isbn: "123", price: 30 },
            item2: { title: "JavaScript Guide", price: 25 },
            item3: { title: "Node.js Mastery", isbn: "789", price: 35 },
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { price: { [GT]: 30 } },
          isbn: true,
        },
      });

      expect(result).toEqual({
        catalog: {
          books: {
            item3: {
              title: "Node.js Mastery",
              price: 35,
              isbn: "789",
            },
          },
        },
      });
    });
  });

  describe("complex predicate patterns", () => {
    it("should match objects with multiple field conditions", () => {
      const data = {
        inventory: {
          item1: { name: "Laptop", price: 1000, stock: 5 },
          item2: { name: "Mouse", price: 50, stock: 100 },
          item3: { name: "Keyboard", price: 150, stock: 0 },
          item4: { name: "Monitor", price: 500, stock: 10 },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: {
            price: { [LT]: 200 },
            stock: { [GT]: 0 },
          },
          name: true,
        },
      });

      expect(result).toEqual({
        inventory: {
          item2: {
            name: "Mouse",
            price: 50,
            stock: 100,
          },
        },
      });
    });

    it("should handle NOT operator in predicates", () => {
      const data = {
        users: {
          u1: { name: "Alice", status: "active" },
          u2: { name: "Bob", status: "inactive" },
          u3: { name: "Charlie", status: "active" },
        },
      };

      // NOTE: Using [NOT]: ["inactive", { [EQ]: null }] to exclude both "inactive" AND null/undefined
      // Without the null check, parent objects (data, users) would match since they have no status field
      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { status: { [NOT]: ["inactive", { [EQ]: null }] } },
          name: true,
        },
      });

      console.log("RESULT: ", result);

      expect(result).toEqual({
        users: {
          u1: { name: "Alice", status: "active" },
          u3: { name: "Charlie", status: "active" },
        },
      });
    });

    it("should handle null and undefined with EQ operator", () => {
      const data = {
        records: {
          r1: { id: 1, value: null },
          r2: { id: 2, value: undefined },
          r3: { id: 3, value: "data" },
          r4: { id: 4 },
        },
      };

      // NOTE: Adding id: { [NEQ]: null } to ensure we only match record objects with an id field
      // Without this, parent objects (data, records) would also match since they have no value field
      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { value: { [EQ]: null }, id: { [NEQ]: null } },
          id: true,
        },
      });

      // EQ with null matches both null and undefined (including missing fields)
      expect(result).toEqual({
        records: {
          r1: { id: 1, value: null },
          r2: { id: 2, value: undefined },
          r4: { id: 4 },
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      const data = {
        a: {},
        b: { c: {} },
      };

      const result = select(data, {
        [DEEP_ALL]: { id: true },
      });

      expect(result).toEqual(undefined);
    });

    it("should handle arrays correctly", () => {
      const data = {
        items: [
          { id: 1, name: "First" },
          { id: 2, name: "Second" },
          { id: 3, name: "Third" },
        ],
      };

      const result = select(data, {
        [DEEP_ALL]: { id: true },
      });

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
    });

    it("should not traverse into primitive values", () => {
      const data = {
        text: "This is a string with id inside",
        number: 12345,
        object: { id: "real-id" },
      };

      const result = select(data, {
        [DEEP_ALL]: { id: true },
      });

      expect(result).toEqual({
        object: { id: "real-id" },
      });
    });

    // Circular references are not handled - they will cause stack overflow
    // This is expected behavior as it matches JavaScript's native handling
  });

  describe("combining with other operators", () => {
    it("should work with regular field selection at the same level", () => {
      const data = {
        metadata: { version: "1.0", author: "System" },
        stores: {
          downtown: {
            inventory: {
              electronics: { count: 50, value: 10000 },
              books: { count: 200, value: 5000 },
            },
            staff: 10,
          },
          uptown: {
            inventory: {
              electronics: { count: 30, value: 15000 },
              books: { count: 500, value: 3000 },
            },
            staff: 8,
          },
        },
      };

      const result = select(data, {
        metadata: true,
        stores: {
          [DEEP_ALL]: {
            [WHERE]: { value: { [GT]: 9000 } },
            count: true,
            value: true,
          },
        },
      });

      expect(result).toEqual({
        metadata: { version: "1.0", author: "System" },
        stores: {
          downtown: {
            inventory: {
              electronics: { count: 50, value: 10000 },
            },
          },
          uptown: {
            inventory: {
              electronics: { count: 30, value: 15000 },
            },
          },
        },
      });
    });

    it("should allow nested DEEP_ALL operators", () => {
      const data = {
        regions: {
          north: {
            stores: {
              s1: { manager: { name: "Alice", level: 3 } },
              s2: { manager: { name: "Bob", level: 2 } },
            },
          },
          south: {
            stores: {
              s3: { manager: { name: "Charlie", level: 3 } },
              s4: { manager: { name: "David", level: 1 } },
            },
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          stores: {
            [DEEP_ALL]: {
              [WHERE]: { level: { [GT]: 2 } },
              name: true,
            },
          },
        },
      });

      expect(result).toEqual({
        regions: {
          north: {
            stores: {
              s1: { manager: { name: "Alice", level: 3 } },
            },
          },
          south: {
            stores: {
              s3: { manager: { name: "Charlie", level: 3 } },
            },
          },
        },
      });
    });
  });

  describe("common use cases", () => {
    it("should find all objects with both required fields", () => {
      const data = {
        items: {
          a: { price: 10, stock: 5 },
          b: { price: 20 },
          c: { stock: 10 },
          d: { price: 30, stock: 0, discount: 0.1 },
        },
      };

      // To find objects with both price and stock, use WHERE
      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: {
            price: { [NOT]: undefined },
            stock: { [NOT]: undefined },
          },
        },
      });

      expect(result).toEqual({
        items: {
          a: { price: 10, stock: 5 },
          d: { price: 30, stock: 0, discount: 0.1 },
        },
      });
    });

    it("should search for text in any field and get identifiers", () => {
      const data = {
        products: {
          p1: {
            id: "PROD-001",
            name: "Organic Orange Juice",
            description: "Fresh and natural",
          },
          p2: {
            id: "PROD-002",
            name: "Apple Juice",
            description: "Made from organic apples",
          },
          p3: {
            id: "PROD-003",
            name: "Grape Juice",
            description: "Sweet grape flavor",
          },
        },
      };

      const result = select(data, {
        [DEEP_ALL]: {
          [WHERE]: { [MATCH]: "/organic/i" },
          id: true,
        },
      });

      expect(result).toEqual({
        products: {
          p1: {
            id: "PROD-001",
            name: "Organic Orange Juice",
          },
          p2: {
            id: "PROD-002",
            description: "Made from organic apples",
          },
        },
      });
    });
  });
});
