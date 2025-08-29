import { describe, it, expect } from "vitest";
import { update, META } from "../src/index.js";

describe("mixed union type updates", () => {
  it("should handle string | object union with direct string assignment", () => {
    type Data = {
      value: string | { name: string };
    };

    const data: Data = {
      value: { name: "Alice" }
    };

    // Direct string assignment (no brackets needed for primitives)
    const changes = update(data, {
      value: "Bob"
    });

    expect(data.value).toBe("Bob");
    expect(changes).toEqual({
      value: "Bob",
      [META]: { value: { original: { name: "Alice" } } }
    });
  });

  it("should handle string | object union with bracketed object replacement", () => {
    type Data = {
      value: string | { name: string };
    };

    const data: Data = {
      value: "Alice"
    };

    // Object needs brackets to distinguish from update statement
    const changes = update(data, {
      value: [{ name: "Bob" }] as [{ name: string }]
    });

    expect(data.value).toEqual({ name: "Bob" });
    expect(changes).toEqual({
      value: { name: "Bob" },
      [META]: { value: { original: "Alice" } }
    });
  });

  it("should handle complex mixed unions", () => {
    type Data = {
      field: string | number | { id: number; label: string } | boolean;
    };

    const data: Data = {
      field: { id: 1, label: "Item" }
    };

    // Primitive assignment without brackets
    const changes1 = update(data, {
      field: "text"
    });

    expect(data.field).toBe("text");

    // Number assignment without brackets
    const changes2 = update(data, {
      field: 42
    });

    expect(data.field).toBe(42);

    // Boolean assignment without brackets
    const changes3 = update(data, {
      field: true
    });

    expect(data.field).toBe(true);

    // Object requires brackets
    const changes4 = update(data, {
      field: [{ id: 2, label: "New Item" }] as [{ id: number; label: string }]
    });

    expect(data.field).toEqual({ id: 2, label: "New Item" });
  });

  it("should handle function | primitive unions", () => {
    type Data = {
      callback: string | (() => void);
    };

    const fn = () => console.log("test");
    const data: Data = {
      callback: fn
    };

    // String can be assigned directly
    const changes1 = update(data, {
      callback: "not a function"
    });

    expect(data.callback).toBe("not a function");

    // Function needs brackets
    const newFn = () => console.log("new");
    const changes2 = update(data, {
      callback: [newFn] as [() => void]
    });

    expect(data.callback).toBe(newFn);
  });

  it("should handle array of mixed unions", () => {
    type Data = {
      items: (string | { value: number })[];
    };

    const data: Data = {
      items: ["hello", { value: 10 }, "world", { value: 20 }]
    };

    // Update specific indices with different types
    const changes = update(data, {
      items: {
        "0": "goodbye", // Replace string with string
        "1": [{ value: 15 }] as [{ value: number }], // Replace object
        "2": [{ value: 25 }] as [{ value: number }], // Replace string with object
        "3": "text" // Replace object with string
      }
    });

    expect(data.items[0]).toBe("goodbye");
    expect(data.items[1]).toEqual({ value: 15 });
    expect(data.items[2]).toEqual({ value: 25 });
    expect(data.items[3]).toBe("text");
  });

  it("should handle nullable mixed unions", () => {
    type Data = {
      value: string | { name: string } | null;
    };

    const data: Data = {
      value: null
    };

    // Can assign null directly
    const changes1 = update(data, {
      value: null
    });

    expect(data.value).toBeNull();

    // Can assign string directly
    const changes2 = update(data, {
      value: "text"
    });

    expect(data.value).toBe("text");

    // Object needs brackets
    const changes3 = update(data, {
      value: [{ name: "Alice" }] as [{ name: string }]
    });

    expect(data.value).toEqual({ name: "Alice" });
  });
});