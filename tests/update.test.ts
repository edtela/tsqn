import { describe, it, expect } from "vitest";
import { update, undo, transaction, META, ALL, WHERE, DEFAULT, CONTEXT } from "../src/index.js";

describe("update functionality", () => {
  describe("direct value updates", () => {
    it("should update simple properties", () => {
      const data = {
        user: { name: "Alice", age: 30 },
        settings: { theme: "dark" },
      };

      const changes = update(data, {
        user: { age: 31 },
        settings: { theme: "light" },
      });

      expect(changes).toEqual({
        user: { age: 31, [META]: { age: { original: 30 } } },
        settings: { theme: "light", [META]: { theme: { original: "dark" } } },
      });
      expect(data.user.age).toBe(31);
      expect(data.settings.theme).toBe("light");
    });

    it("should return undefined when no changes occur", () => {
      const data = {
        user: { name: "Alice", age: 30 },
      };

      const changes = update(data, {
        user: { age: 30 }, // Same value
      });

      expect(changes).toBeUndefined();
    });

    it("should handle nested updates", () => {
      const data = {
        app: {
          ui: { theme: "dark", fontSize: 14 },
          features: { autoSave: true },
        },
      };

      const changes = update(data, {
        app: {
          ui: { theme: "light" },
        },
      });

      expect(changes).toEqual({
        app: {
          ui: { theme: "light", [META]: { theme: { original: "dark" } } },
        },
      });
      expect(data.app.ui.theme).toBe("light");
      expect(data.app.ui.fontSize).toBe(14); // Unchanged
    });
  });

  describe("function updates", () => {
    it("should apply function transforms", () => {
      const data = {
        user: { name: "alice", score: 100 },
      };

      const changes = update(data, {
        user: {
          name: (current: string) => current.toUpperCase(),
          score: (current: number) => current * 2,
        },
      });

      expect(changes).toEqual({
        user: {
          name: "ALICE",
          score: 200,
          [META]: {
            name: { original: "alice" },
            score: { original: 100 },
          },
        },
      });
      expect(data.user.name).toBe("ALICE");
      expect(data.user.score).toBe(200);
    });

    it("should handle functions that return nested updates", () => {
      const data = {
        counter: { value: 5, metadata: { lastUpdate: 0 } },
      };

      const now = Date.now();
      const changes = update(data, {
        counter: (current) => ({
          value: current.value + 1,
          metadata: { lastUpdate: now },
        }),
      });

      expect(data.counter.value).toBe(6);
      expect(data.counter.metadata.lastUpdate).toBe(now);
    });
  });

  describe("array replacement operator []", () => {
    it("should replace entire value with [value]", () => {
      const data = {
        user: { name: "Alice", age: 30, city: "NYC" },
      };

      const changes = update(data, {
        user: [{ name: "Bob", age: 25, city: "LA" }] as [{ name: string; age: number; city: string }],
      });

      expect(data.user).toEqual({ name: "Bob", age: 25, city: "LA" });
      expect(changes).toEqual({
        user: { name: "Bob", age: 25, city: "LA" },
        [META]: { user: { original: { name: "Alice", age: 30, city: "NYC" } } },
      });
    });

    it("should delete optional property with empty []", () => {
      const data: { user: { name: string; nickname?: string } } = {
        user: { name: "Alice", nickname: "Ali" },
      };

      const changes = update(data, {
        user: { nickname: [] },
      });

      expect(data.user).toEqual({ name: "Alice" });
      expect("nickname" in data.user).toBe(false);
    });

    it("should handle array element replacement", () => {
      const data = {
        items: [
          { id: 1, name: "Item 1", quantity: 5 },
          { id: 2, name: "Item 2", quantity: 10 },
        ],
      };

      const changes = update(data, {
        items: {
          "0": [{ id: 1, name: "Updated Item", quantity: 3 }],
        },
      });

      expect(data.items[0]).toEqual({ id: 1, name: "Updated Item", quantity: 3 });
    });
  });

  describe("undo functionality", () => {
    it("should undo simple changes", () => {
      const data = {
        user: { name: "Alice", age: 30 },
      };

      const changes = update(data, {
        user: { age: 31 },
      });

      expect(data.user.age).toBe(31);

      undo(data, changes);
      expect(data.user.age).toBe(30);
    });

    it("should undo nested changes", () => {
      const data = {
        app: {
          settings: {
            theme: "dark",
            fontSize: 14,
          },
        },
      };

      const changes = update(data, {
        app: {
          settings: {
            theme: "light",
            fontSize: 16,
          },
        },
      });

      expect(data.app.settings.theme).toBe("light");
      expect(data.app.settings.fontSize).toBe(16);

      undo(data, changes);
      expect(data.app.settings.theme).toBe("dark");
      expect(data.app.settings.fontSize).toBe(14);
    });
  });

  describe("ALL operator", () => {
    it("should update all properties in an object", () => {
      const data = {
        items: {
          item1: { price: 10, inStock: false },
          item2: { price: 20, inStock: false },
          item3: { price: 30, inStock: false },
        },
      };

      const changes = update(data, {
        items: {
          [ALL]: { inStock: true },
        },
      });

      expect(data.items.item1.inStock).toBe(true);
      expect(data.items.item2.inStock).toBe(true);
      expect(data.items.item3.inStock).toBe(true);
    });

    it("should update all array elements", () => {
      const data = {
        products: [
          { name: "Product 1", discount: 0 },
          { name: "Product 2", discount: 0 },
        ],
      };

      const changes = update(data, {
        products: {
          [ALL]: { discount: 10 },
        },
      });

      expect(data.products[0].discount).toBe(10);
      expect(data.products[1].discount).toBe(10);
    });

    it("should apply function to all properties", () => {
      const data = {
        scores: {
          alice: 100,
          bob: 200,
          charlie: 150,
        },
      };

      const changes = update(data, {
        scores: {
          [ALL]: (current: number) => current * 1.1,
        },
      });

      expect(data.scores.alice).toBeCloseTo(110, 10);
      expect(data.scores.bob).toBeCloseTo(220, 10);
      expect(data.scores.charlie).toBeCloseTo(165, 10);
    });
  });

  describe("WHERE operator", () => {
    it("should conditionally update based on predicate", () => {
      const data = {
        users: [
          { name: "Alice", age: 30, status: "active" },
          { name: "Bob", age: 65, status: "active" },
          { name: "Charlie", age: 70, status: "active" },
        ],
      };

      const changes = update(data, {
        users: {
          [ALL]: {
            [WHERE]: (user) => user.age >= 65,
            status: "senior",
          },
        },
      });

      expect(data.users[0].status).toBe("active");
      expect(data.users[1].status).toBe("senior");
      expect(data.users[2].status).toBe("senior");
    });

    it("should skip update when WHERE returns false", () => {
      const data = {
        config: { mode: "production", debug: false },
      };

      const changes = update(data, {
        config: {
          [WHERE]: (cfg) => cfg.mode === "development",
          debug: true,
        },
      });

      expect(data.config.debug).toBe(false);
      expect(changes).toBeUndefined();
    });
  });

  describe("DEFAULT operator", () => {
    it("should initialize null field with DEFAULT before update", () => {
      const data: any = {
        user: { profile: null },
      };

      const changes = update(data, {
        user: {
          profile: {
            [DEFAULT]: { name: "", bio: "", avatar: "" },
            name: "Alice",
            bio: "Developer",
          },
        },
      });

      expect(data.user.profile).toEqual({
        name: "Alice",
        bio: "Developer",
        avatar: "",
      });

      expect(changes).toEqual({
        user: {
          profile: {
            name: "Alice",
            bio: "Developer",
            avatar: "",
          },
          [META]: {
            profile: { original: null },
          },
        },
      });
    });

    it("should work with arrays", () => {
      const data: any = {
        cart: { items: null },
      };

      const changes = update(data, {
        cart: {
          items: {
            [DEFAULT]: [],
            "0": [{ id: "item1", quantity: 2 }],
          },
        },
      });

      expect(data.cart.items).toEqual([{ id: "item1", quantity: 2 }]);
    });

    it("should not use DEFAULT when field is not null", () => {
      const data = {
        user: {
          profile: { name: "Bob", bio: "Existing" },
        },
      };

      const changes = update(data, {
        user: {
          profile: {
            [DEFAULT]: { name: "", bio: "", avatar: "" },
            bio: "Updated",
          },
        },
      });

      expect(data.user.profile).toEqual({
        name: "Bob",
        bio: "Updated",
      });
    });
  });

  describe("CONTEXT operator", () => {
    it("should pass context variables to functions", () => {
      const data: {
        items: Array<{ price: number; finalPrice?: number }>;
      } = {
        items: [{ price: 100 }, { price: 200 }],
      };

      const changes = update(data, {
        [CONTEXT]: { taxRate: 0.08, discount: 0.1 },
        items: {
          [ALL]: {
            finalPrice: (current: any, item: any, key: string, ctx: any) =>
              item.price * (1 - ctx.discount) * (1 + ctx.taxRate),
          },
        },
      });

      expect(data.items[0]).toHaveProperty("finalPrice");
      expect(data.items[0].finalPrice).toBeCloseTo(97.2, 1);
      expect(data.items[1].finalPrice).toBeCloseTo(194.4, 1);
    });

    it("should allow context override at nested levels", () => {
      const data = {
        regular: { price: 100 },
        special: { price: 100 },
      };

      const changes = update(data, {
        [CONTEXT]: { multiplier: 1.0 },
        regular: {
          price: (current: number, item: any, key: string, ctx: any) => current * ctx.multiplier,
        },
        special: {
          [CONTEXT]: { multiplier: 1.5 },
          price: (current: number, item: any, key: string, ctx: any) => current * ctx.multiplier,
        },
      });

      expect(data.regular.price).toBe(100);
      expect(data.special.price).toBe(150);
    });

    it("should pass context through WHERE predicates", () => {
      const data: {
        items: Array<{ value: number; marked?: boolean }>;
      } = {
        items: [{ value: 50 }, { value: 150 }],
      };

      const changes = update(data, {
        [CONTEXT]: { threshold: 100 },
        items: {
          [ALL]: {
            [WHERE]: (item: any, ctx: any) => item.value >= ctx.threshold,
            marked: true,
          },
        },
      });

      expect(data.items[0]).not.toHaveProperty("marked");
      expect(data.items[1]).toHaveProperty("marked");
      expect(data.items[1].marked).toBe(true);
    });
  });

  describe("transaction", () => {
    it("should accumulate multiple updates and return combined changes", () => {
      const data = {
        user: { name: "Alice", age: 30 },
        settings: { theme: "dark", fontSize: 14 },
      };

      const tx = transaction(data);
      tx.update({ user: { age: 31 } });
      tx.update({ settings: { theme: "light" } });
      const changes = tx.commit();

      // Data should be updated
      expect(data.user.age).toBe(31);
      expect(data.settings.theme).toBe("light");

      // Changes should be accumulated
      expect(changes).toEqual({
        user: { age: 31, [META]: { age: { original: 30 } } },
        settings: { theme: "light", [META]: { theme: { original: "dark" } } },
      });
    });

    it("should support method chaining", () => {
      const data = {
        counter: { value: 0 },
        status: { active: false },
      };

      const changes = transaction(data)
        .update({ counter: { value: 1 } })
        .update({ counter: { value: 2 } })
        .update({ status: { active: true } })
        .commit();

      expect(data.counter.value).toBe(2);
      expect(data.status.active).toBe(true);

      // Changes should track original values
      expect(changes).toEqual({
        counter: { value: 2, [META]: { value: { original: 0 } } },
        status: { active: true, [META]: { active: { original: false } } },
      });
    });

    it("should revert all changes when revert is called", () => {
      const data = {
        user: { name: "Alice", age: 30 },
        settings: { theme: "dark" },
      };

      const tx = transaction(data);
      tx.update({ user: { name: "Bob", age: 31 } });
      tx.update({ settings: { theme: "light" } });

      // Verify changes were applied
      expect(data.user.name).toBe("Bob");
      expect(data.user.age).toBe(31);
      expect(data.settings.theme).toBe("light");

      // Revert all changes
      tx.revert();

      // Data should be back to original
      expect(data.user.name).toBe("Alice");
      expect(data.user.age).toBe(30);
      expect(data.settings.theme).toBe("dark");
    });

    it("should clear changes after revert", () => {
      const data = { value: 1 };

      const tx = transaction(data);
      tx.update({ value: 2 });
      tx.revert();

      const changes = tx.commit();
      expect(changes).toBeUndefined();
    });

    it("should handle complex nested updates in transaction", () => {
      const data = {
        users: [
          { id: 1, name: "Alice", score: 100 },
          { id: 2, name: "Bob", score: 200 },
        ],
      };

      const changes = transaction(data)
        .update({
          users: {
            "0": { score: (s: number) => s + 10 },
          },
        })
        .update({
          users: {
            [ALL]: {
              bonus: 5,
            },
          },
        })
        .commit();

      expect(data.users[0].score).toBe(110);
      expect(data.users[0]).toHaveProperty("bonus", 5);
      expect(data.users[1]).toHaveProperty("bonus", 5);
    });
  });
});
