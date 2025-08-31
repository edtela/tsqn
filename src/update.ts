import { ALL, WHERE, DEFAULT, CONTEXT, META } from "./symbols.js";
import type { Update, UpdateResult } from "./types.js";
import { evalPredicate } from "./predicate.js";

export function update<T extends object>(d: T, u?: Update<T>, c?: UpdateResult<T>): UpdateResult<T> | undefined {
  return updateImpl(d, u, c);
}

export function updateImpl(data: any, statement?: any, changes?: any, context?: any): any {
  if (!statement) return undefined;

  const { [WHERE]: where, [ALL]: all, [DEFAULT]: defaulT, [CONTEXT]: vars, ...rest } = statement;
  const staticUpdate = rest;

  if (vars) {
    context = context ? { ...context, ...vars } : vars;
  }

  if (where) {
    // Check if it's a function or a predicate
    const whereResult = typeof where === 'function' 
      ? where(data, context)
      : evalPredicate(data, where);
    
    if (!whereResult) {
      return changes;
    }
  }

  if (all) {
    for (const key in data) {
      if (staticUpdate[key] === undefined) {
        staticUpdate[key] = all;
      }
    }
  }

  function addValueChange(key: string, oldValue: any) {
    const newValue = data[key];

    if (oldValue != null && typeof oldValue === "object") {
      //we need to undo changes that may have occured before setting it as original
      const oldValueChanges = changes?.[key];
      if (oldValueChanges) {
        undoImpl(oldValue, oldValueChanges);
      }
    }

    if (!changes) {
      changes = {};
    }
    changes[key] = newValue;

    const meta = changes[META];
    if (meta) {
      if (!meta[key]) {
        // only record on first change, original value
        meta[key] = { original: oldValue };
      }
    } else {
      changes[META] = { [key]: { original: oldValue } };
    }
  }

  function updateKey(key: string, oldValue: any, newValue: any, replace = false) {
    if (oldValue === newValue) {
      return;
    }

    if (!replace && newValue != null && typeof newValue === "object") {
      if (oldValue == null || typeof oldValue !== "object") {
        //check the where statement before throwing error
        const where = newValue[WHERE];
        if (where) {
          const whereResult = typeof where === 'function'
            ? where(oldValue, context)
            : evalPredicate(oldValue, where);
          
          if (!whereResult) {
            return;
          }
        }

        const defaultValue = newValue[DEFAULT];
        if (defaultValue) {
          data[key] = structuredClone(defaultValue);
          updateImpl(data[key], newValue, undefined, context);
          addValueChange(key, oldValue);
          return;
        }

        throw Error(`Can't partially update a non-object: ${key}`);
      }

      const change = updateImpl(oldValue, newValue, changes ? changes[key] : undefined, context);
      if (change) {
        if (changes) {
          changes[key] = change;
        } else {
          changes = { [key]: change };
        }
      }
      return;
    }

    // newValue null or not an object or full object, set directly
    data[key] = newValue;
    addValueChange(key, oldValue);
  }

  // Process each key in the expanded transform
  for (const key in staticUpdate) {
    // Handle numeric indices (including negative) for arrays
    let actualKey = key;
    if (Array.isArray(data)) {
      // Check if key is numeric (positive or negative)
      if (/^-?\d+$/.test(key)) {
        const index = parseInt(key, 10);
        actualKey = index < 0 ? String(data.length + index) : key;
      } else if (key !== ALL.toString()) {
        // Skip non-numeric keys for arrays (except ALL symbol)
        continue;
      }
    }

    let oldValue = data[actualKey];
    const operand = staticUpdate[key];
    const staticOperand = typeof operand === "function" ? operand(oldValue, data, actualKey, context) : operand;

    if (Array.isArray(staticOperand)) {
      if (staticOperand.length === 0) {
        delete data[actualKey];
        addValueChange(actualKey, oldValue);
        continue;
      }

      if (staticOperand.length === 1) {
        //structured clone can still fail for functions within operand
        const newValue = typeof staticOperand[0] === "function" ? staticOperand[0] : structuredClone(staticOperand[0]);
        updateKey(actualKey, oldValue, newValue, true);
      } else {
        throw new Error("Multiple element arrays not allowed"); //TODO collect warning
      }
    } else {
      updateKey(actualKey, oldValue, staticOperand);
    }
  }

  return changes;
}

export function undo<T extends object>(data: T, result: UpdateResult<T> | undefined) {
  return undoImpl(data, result);
}

function undoImpl(data: any, result: any) {
  if (data == null || typeof data !== "object" || result === undefined) {
    return data;
  }

  const { [META]: meta, ...rest } = result;
  for (const key in rest) {
    const change = rest[key];
    if (meta && key in meta) {
      data[key] = meta[key].original;
    } else {
      undoImpl(data[key], change);
    }
  }
}

function mergeResults(result: UpdateResult<any>, changes: UpdateResult<any>) {
  for (const key of Object.keys(changes)) {
    if (key in result) {
      const value = result[key];
      const change = changes[key];

      const meta = result[META]?.[key];
      if (meta && meta.original === change) {
        delete result[key];
        //TODO delete meta
        continue;
      }

      if (change == null || value === null || typeof change !== "object" || typeof value !== "object") {
        result[key] = change;
        continue;
      }

      mergeResults(value, change);
    } else {
      result[key] = changes[key];
    }
  }
}

export function transaction<T extends object>(data: T) {
  let changes: UpdateResult<T> | undefined;

  return {
    update(stmt: Update<T>) {
      changes = updateImpl(data, stmt, changes);
      return this; // Allow chaining
    },
    commit: () => {
      const v = changes;
      changes = undefined;
      return v;
    },
    revert: () => {
      if (changes) {
        undo(data, changes);
      }
      changes = undefined;
    },
  };
}

