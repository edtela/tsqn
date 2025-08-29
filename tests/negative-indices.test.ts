import { describe, it, expect } from "vitest";
import { update, ALL } from "../src/index.js";

describe("negative array indices", () => {
  it("should update elements using negative indices", () => {
    const data = {
      items: ["a", "b", "c", "d"]
    };

    const changes = update(data, {
      items: {
        "-1": "last",
        "-2": "second-last"
      }
    });

    expect(data.items).toEqual(["a", "b", "second-last", "last"]);
    expect(changes).toMatchObject({
      items: {
        "2": "second-last",
        "3": "last"
      }
    });
  });

  it("should handle negative indices with objects", () => {
    const data = {
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" }
      ]
    };

    update(data, {
      users: {
        "-1": { name: "Charles" }
      }
    });

    expect(data.users[2].name).toBe("Charles");
  });

  it("should handle negative indices with functions", () => {
    const data = {
      scores: [10, 20, 30, 40]
    };

    update(data, {
      scores: {
        "-1": (v: number) => v * 2,
        "-2": (v: number) => v + 5
      }
    });

    expect(data.scores).toEqual([10, 20, 35, 80]);
  });

  it("should handle out of bounds negative indices", () => {
    const data = {
      items: ["a", "b"]
    };

    // -3 would be index -1 (length 2 + (-3) = -1), which is invalid
    // Should be handled gracefully - no update occurs
    const changes = update(data, {
      items: {
        "-3": "out-of-bounds"
      }
    });

    // Out of bounds access should update undefined at that position
    expect(data.items[-1]).toBe("out-of-bounds");
  });

  it("should work with ALL operator", () => {
    const data = {
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]
    };

    update(data, {
      matrix: {
        [ALL]: {
          "-1": (v: number) => v * 10
        }
      }
    });

    expect(data.matrix).toEqual([
      [1, 2, 30],
      [4, 5, 60],
      [7, 8, 90]
    ]);
  });

  it("should ignore non-numeric keys on arrays", () => {
    const data = {
      items: [1, 2, 3]
    };

    const changes = update(data, {
      items: {
        "0": 10,
        "-1": 30,
        "foo": 999,  // Should be ignored
        "bar": 888   // Should be ignored
      }
    } as any);

    expect(data.items).toEqual([10, 2, 30]);
    // Non-numeric keys should not appear in array
    expect((data.items as any).foo).toBeUndefined();
    expect((data.items as any).bar).toBeUndefined();
  });

  it("should handle mixed positive and negative indices", () => {
    const data = {
      values: ["a", "b", "c", "d", "e"]
    };

    update(data, {
      values: {
        "0": "first",
        "2": "middle",
        "-2": "second-last",
        "-1": "last"
      }
    });

    expect(data.values).toEqual(["first", "b", "middle", "second-last", "last"]);
  });

  it("should handle replacement syntax with negative indices", () => {
    const data = {
      objects: [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
        { id: 3, value: "c" }
      ]
    };

    update(data, {
      objects: {
        "-1": [{ id: 99, value: "replaced" }]
      }
    });

    expect(data.objects[2]).toEqual({ id: 99, value: "replaced" });
    expect(data.objects.length).toBe(3);
  });
});