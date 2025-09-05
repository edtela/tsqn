import { describe, it, expect } from "vitest";
import { 
  toJSON, fromJSON, SerializationError, validateNoFunctions,
  ALL, WHERE, DEFAULT, CONTEXT, META,
  LT, GT, LTE, GTE, EQ, NEQ, NOT, MATCH, SOME
} from "../src/index.js";

describe("serialization", () => {
  describe("toJSON", () => {
    it("should convert symbol keys to strings", () => {
      const statement = {
        items: {
          [ALL]: { price: 100 }
        }
      };
      
      const json = toJSON(statement);
      
      expect(json).toEqual({
        items: {
          "*": { price: 100 }
        }
      });
    });

    it("should handle multiple symbols", () => {
      const statement = {
        [WHERE]: (x: any) => x > 5,
        [DEFAULT]: {},
        [CONTEXT]: { user: "test" }
      };
      
      // This should throw because of the function
      expect(() => toJSON(statement)).toThrow(SerializationError);
    });

    it("should handle nested symbols", () => {
      const statement = {
        data: {
          items: {
            [ALL]: {
              [WHERE]: { price: { [GT]: 10 } },
              discount: 20
            }
          }
        }
      };
      
      const json = toJSON(statement);
      
      expect(json).toEqual({
        data: {
          items: {
            "*": {
              "?": { price: { ">": 10 } },
              discount: 20
            }
          }
        }
      });
    });

    it("should preserve regular keys", () => {
      const statement = {
        name: "test",
        items: {
          item1: { price: 10 },
          [ALL]: { inStock: true }
        }
      };
      
      const json = toJSON(statement);
      
      expect(json).toEqual({
        name: "test",
        items: {
          item1: { price: 10 },
          "*": { inStock: true }
        }
      });
    });

    it("should handle arrays with symbols", () => {
      const statement = [
        { [ALL]: true },
        { regular: "key" },
        { [META]: { original: 5 } }
      ];
      
      const json = toJSON(statement);
      
      expect(json).toEqual([
        { "*": true },
        { regular: "key" },
        { "#": { original: 5 } }
      ]);
    });

    it("should throw error when functions are found", () => {
      const statement = {
        items: {
          [ALL]: (x: any) => x * 2
        }
      };
      
      expect(() => toJSON(statement)).toThrow(SerializationError);
      expect(() => toJSON(statement)).toThrow(/at path: items.\*/);
    });

    it("should handle all predicate symbols", () => {
      const statement = {
        [LT]: 5,
        [GT]: 10,
        [LTE]: 5,
        [GTE]: 10,
        [EQ]: "test",
        [NEQ]: "other",
        [NOT]: true,
        [MATCH]: "pattern",
        [SOME]: [1, 2, 3]
      };
      
      const json = toJSON(statement);
      
      expect(json).toEqual({
        "<": 5,
        ">": 10,
        "<=": 5,
        ">=": 10,
        "==": "test",
        "!=": "other",
        "!": true,
        "~": "pattern",
        "|": [1, 2, 3]
      });
    });
  });

  describe("fromJSON", () => {
    it("should convert string keys back to symbols", () => {
      const json = {
        items: {
          "*": { price: 100 }
        }
      };
      
      const statement = fromJSON(json);
      
      expect(statement).toEqual({
        items: {
          [ALL]: { price: 100 }
        }
      });
    });

    it("should handle nested symbol strings", () => {
      const json = {
        data: {
          items: {
            "*": {
              "?": { price: { ">": 10 } },
              discount: 20
            }
          }
        }
      };
      
      const statement = fromJSON(json);
      
      expect(statement).toEqual({
        data: {
          items: {
            [ALL]: {
              [WHERE]: { price: { [GT]: 10 } },
              discount: 20
            }
          }
        }
      });
    });

    it("should preserve non-symbol strings", () => {
      const json = {
        name: "test",
        "*star": "not a symbol", // Regular string that happens to be "*"
        items: {
          "*": { inStock: true } // This IS a symbol
        }
      };
      
      const statement = fromJSON(json);
      
      expect(statement).toEqual({
        name: "test",
        "*star": "not a symbol",
        items: {
          [ALL]: { inStock: true }
        }
      });
    });

    it("should handle arrays", () => {
      const json = [
        { "*": true },
        { regular: "key" },
        { "#": { original: 5 } }
      ];
      
      const statement = fromJSON(json);
      
      expect(statement).toEqual([
        { [ALL]: true },
        { regular: "key" },
        { [META]: { original: 5 } }
      ]);
    });
  });

  describe("round-trip serialization", () => {
    it("should preserve structure through serialization and deserialization", () => {
      const original = {
        menu: {
          items: {
            [ALL]: {
              price: 100,
              [DEFAULT]: { inStock: true }
            },
            special: {
              [WHERE]: { category: "premium" },
              discount: 0.1
            }
          },
          [META]: {
            original: "data"
          }
        }
      };
      
      const json = toJSON(original);
      const restored = fromJSON(json);
      
      expect(restored).toEqual(original);
    });

    it("should handle complex nested structures", () => {
      const original = {
        [CONTEXT]: { user: "admin" },
        data: [
          { [ALL]: { [GT]: 5 } },
          { items: { [WHERE]: { [MATCH]: "test.*" } } }
        ],
        predicates: {
          [LT]: 10,
          [GTE]: 5,
          [NEQ]: null
        }
      };
      
      const json = toJSON(original);
      const restored = fromJSON(json);
      
      expect(restored).toEqual(original);
    });
  });

  describe("validateNoFunctions", () => {
    it("should pass for objects without functions", () => {
      const statement = {
        items: {
          [ALL]: { price: 100 },
          specific: { name: "test" }
        }
      };
      
      expect(validateNoFunctions(statement)).toBe(true);
    });

    it("should throw for objects with functions", () => {
      const statement = {
        items: {
          [ALL]: (x: any) => x * 2
        }
      };
      
      expect(() => validateNoFunctions(statement)).toThrow(SerializationError);
      expect(() => validateNoFunctions(statement)).toThrow(/at path: items.\*/);
    });

    it("should detect deeply nested functions", () => {
      const statement = {
        a: {
          b: {
            c: {
              d: {
                transform: (x: any) => x + 1
              }
            }
          }
        }
      };
      
      expect(() => validateNoFunctions(statement)).toThrow(/at path: a.b.c.d.transform/);
    });
  });
});