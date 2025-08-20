import { describe, it, expect } from "vitest";
import { update, undo, ALL, WHERE, META } from "../src/index.js";

describe("Record type updates", () => {
  describe("Basic Record<string, T> updates", () => {
    it("should update existing keys in Record<string, number>", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      const changes = update(data, {
        a: 10,
        b: 20,
      });

      expect(changes).toEqual({
        a: 10,
        b: 20,
        [META]: {
          a: { original: 1 },
          b: { original: 2 },
        },
      });
      expect(data.a).toBe(10);
      expect(data.b).toBe(20);
      expect(data.c).toBe(3);
    });

    it("should add new keys to Record<string, number>", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
      };

      const changes = update(data, {
        c: 30,
        d: 40,
      });

      expect(changes).toEqual({
        c: 30,
        d: 40,
        [META]: {
          c: { original: undefined },
          d: { original: undefined },
        },
      });
      expect(data.c).toBe(30);
      expect(data.d).toBe(40);
    });

    it("should delete keys from Record using empty array", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      const changes = update(data, {
        b: [],
      });

      expect(changes).toEqual({
        [META]: {
          b: { original: 2 },
        },
      });
      expect(data.b).toBeUndefined();
      expect("b" in data).toBe(false);
    });
  });

  describe("Function updates on Record types", () => {
    it("should apply functions to existing keys", () => {
      const data: Record<string, number> = {
        x: 10,
        y: 20,
        z: 30,
      };

      const changes = update(data, {
        x: (v) => v * 2,
        y: (v) => v + 5,
      });

      expect(changes).toEqual({
        x: 20,
        y: 25,
        [META]: {
          x: { original: 10 },
          y: { original: 20 },
        },
      });
      expect(data.x).toBe(20);
      expect(data.y).toBe(25);
    });

    it("should apply functions to create new keys", () => {
      const data: Record<string, number> = {
        a: 10,
      };

      const changes = update(data, {
        b: () => 100,
        c: (_v, _data, key) => key.charCodeAt(0),
      });

      expect(changes).toEqual({
        b: 100,
        c: 99, // 'c'.charCodeAt(0)
        [META]: {
          b: { original: undefined },
          c: { original: undefined },
        },
      });
      expect(data.b).toBe(100);
      expect(data.c).toBe(99);
    });
  });

  describe("ALL operator on Record types", () => {
    it("should update all existing keys with same value", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      const changes = update(data, {
        [ALL]: 100,
      });

      expect(changes).toEqual({
        a: 100,
        b: 100,
        c: 100,
        [META]: {
          a: { original: 1 },
          b: { original: 2 },
          c: { original: 3 },
        },
      });
      expect(data.a).toBe(100);
      expect(data.b).toBe(100);
      expect(data.c).toBe(100);
    });

    it("should apply function to all keys", () => {
      const data: Record<string, number> = {
        x: 10,
        y: 20,
        z: 30,
      };

      const changes = update(data, {
        [ALL]: (v: number) => v * 2,
      });

      expect(changes).toEqual({
        x: 20,
        y: 40,
        z: 60,
        [META]: {
          x: { original: 10 },
          y: { original: 20 },
          z: { original: 30 },
        },
      });
    });

    it("should combine ALL with specific key updates", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      const changes = update(data, {
        [ALL]: 10,
        b: 99, // Override ALL for specific key
      });

      expect(changes).toEqual({
        a: 10,
        b: 99,
        c: 10,
        [META]: {
          a: { original: 1 },
          b: { original: 2 },
          c: { original: 3 },
        },
      });
    });
  });

  describe("Nested Record types", () => {
    it("should update nested Record<string, Record<string, number>>", () => {
      const data: Record<string, Record<string, number>> = {
        group1: { a: 1, b: 2 },
        group2: { c: 3, d: 4 },
      };

      const changes = update(data, {
        group1: { a: 10 },
        group3: [{ e: 5, f: 6 }], // Add new group with replacement syntax
      });

      expect(changes).toEqual({
        group1: {
          a: 10,
          [META]: { a: { original: 1 } },
        },
        group3: { e: 5, f: 6 },
        [META]: {
          group3: { original: undefined },
        },
      });
      expect(data.group1.a).toBe(10);
      expect(data.group1.b).toBe(2);
      expect(data.group3).toEqual({ e: 5, f: 6 });
    });

    it("should apply ALL to nested Record", () => {
      const data: Record<string, Record<string, number>> = {
        group1: { a: 1, b: 2 },
        group2: { c: 3, d: 4 },
      };

      const changes = update(data, {
        [ALL]: {
          [ALL]: 100,
        },
      });

      expect(changes).toEqual({
        group1: {
          a: 100,
          b: 100,
          [META]: {
            a: { original: 1 },
            b: { original: 2 },
          },
        },
        group2: {
          c: 100,
          d: 100,
          [META]: {
            c: { original: 3 },
            d: { original: 4 },
          },
        },
      });
    });
  });

  describe("Complex Record types", () => {
    it("should handle Record<string, { value: number; label: string }>", () => {
      const data: Record<string, { value: number; label: string }> = {
        item1: { value: 1, label: "First" },
        item2: { value: 2, label: "Second" },
      };

      const changes = update(data, {
        item1: { value: 10 }, // Partial update
        item3: [{ value: 3, label: "Third" }], // Add new with replacement syntax
        item2: { label: (s: string) => s.toUpperCase() }, // Function update
      });

      expect(changes).toEqual({
        item1: {
          value: 10,
          [META]: { value: { original: 1 } },
        },
        item2: {
          label: "SECOND",
          [META]: { label: { original: "Second" } },
        },
        item3: { value: 3, label: "Third" },
        [META]: {
          item3: { original: undefined },
        },
      });
      expect(data.item1).toEqual({ value: 10, label: "First" });
      expect(data.item2).toEqual({ value: 2, label: "SECOND" });
      expect(data.item3).toEqual({ value: 3, label: "Third" });
    });

    it("should handle WHERE with Record types", () => {
      const data: Record<string, { value: number; active: boolean }> = {
        a: { value: 10, active: true },
        b: { value: 20, active: false },
        c: { value: 30, active: true },
      };

      const changes = update(data, {
        [ALL]: {
          [WHERE]: (item: any) => item.active,
          value: (v: number) => v * 2,
        },
      });

      expect(changes).toEqual({
        a: {
          value: 20,
          [META]: { value: { original: 10 } },
        },
        c: {
          value: 60,
          [META]: { value: { original: 30 } },
        },
      });
      expect(data.a.value).toBe(20);
      expect(data.b.value).toBe(20); // Unchanged
      expect(data.c.value).toBe(60);
    });
  });

  describe("Undo on Record types", () => {
    it("should undo changes to Record", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
      };

      const changes = update(data, {
        a: 10,
        b: 20,
        c: 30,
      });

      expect(data).toEqual({ a: 10, b: 20, c: 30 });

      undo(data, changes);

      expect(data).toEqual({ a: 1, b: 2, c: undefined });
    });

    it("should undo deletion of keys", () => {
      const data: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      const changes = update(data, {
        b: [],
      });

      expect("b" in data).toBe(false);

      undo(data, changes);

      expect(data.b).toBe(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty Record", () => {
      const data: Record<string, number> = {};

      const changes = update(data, {
        a: 1,
        b: 2,
      });

      expect(changes).toEqual({
        a: 1,
        b: 2,
        [META]: {
          a: { original: undefined },
          b: { original: undefined },
        },
      });
      expect(data).toEqual({ a: 1, b: 2 });
    });

    it("should handle Record with mixed value types", () => {
      const sym = Symbol("test");
      const data: Record<string, any> = {
        a: sym,
        b: 2,
        c: "text",
      };

      const changes = update(data, {
        a: "replaced",
        b: 10,
        c: "updated",
      });

      expect(changes).toEqual({
        a: "replaced",
        b: 10,
        c: "updated",
        [META]: {
          a: { original: sym },
          b: { original: 2 },
          c: { original: "text" },
        },
      });
      expect(data.a).toBe("replaced");
      expect(data.b).toBe(10);
      expect(data.c).toBe("updated");
    });

    it("should handle Record<string, any> with any values", () => {
      const data: Record<string, any> = {
        a: 1,
        b: "string",
        c: { nested: true },
        d: null,
      };

      const changes = update(data, {
        a: 100,
        b: "updated",
        c: { nested: false },
        d: [{ new: "object" }], // Use replacement syntax for null -> object
      });

      expect(changes).toEqual({
        a: 100,
        b: "updated",
        c: {
          nested: false,
          [META]: { nested: { original: true } },
        },
        d: { new: "object" },
        [META]: {
          a: { original: 1 },
          b: { original: "string" },
          d: { original: null },
        },
      });
    });

    it("should preserve non-updated keys in Record", () => {
      const data: Record<string, { x: number; y: number }> = {
        point1: { x: 1, y: 2 },
        point2: { x: 3, y: 4 },
        point3: { x: 5, y: 6 },
      };

      const changes = update(data, {
        point2: { x: 10 },
      });

      expect(data.point1).toEqual({ x: 1, y: 2 });
      expect(data.point2).toEqual({ x: 10, y: 4 });
      expect(data.point3).toEqual({ x: 5, y: 6 });
    });
  });
});
