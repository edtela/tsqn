import {
  ALL,
  WHERE,
  DEFAULT,
  CONTEXT,
  META,
} from "./symbols.js";
import type { Update, UpdateResult } from "./types.js";

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

  if (where && !where(data, context)) {
    return changes;
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
        undoUpdateImpl(oldValue, oldValueChanges);
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
        if (where && !where(oldValue, context)) {
          return;
        }

        const defaultValue = newValue[DEFAULT];
        if (defaultValue) {
          data[key] = structuredClone(defaultValue);
          updateImpl(data[key], newValue, undefined, context);
          addValueChange(key, oldValue);
          return;
        }

        console.error(`Can't partially update a non-object: ${key}`);
        return;
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
    let oldValue = data[key];

    const operand = staticUpdate[key];
    const staticOperand = typeof operand === "function" ? operand(oldValue, data, key, context) : operand;

    if (Array.isArray(staticOperand)) {
      if (staticOperand.length === 0) {
        delete data[key];
        addValueChange(key, oldValue);
        continue;
      }

      if (staticOperand.length === 1) {
        //structured clone can still fail for functions within operand
        const newValue = typeof staticOperand[0] === "function" ? staticOperand[0] : structuredClone(staticOperand[0]);
        updateKey(key, oldValue, newValue, true);
      } else {
        throw new Error("Multiple element arrays not allowed"); //TODO collect warning
      }
    } else {
      updateKey(key, oldValue, staticOperand);
    }
  }

  return changes;
}

export function undo<T extends object>(data: T, result: UpdateResult<T> | undefined) {
  return undoUpdateImpl(data, result);
}

function undoUpdateImpl(data: any, result: any) {
  if (data == null || typeof data !== "object" || result === undefined) {
    return data;
  }

  const { [META]: meta, ...rest } = result;
  for (const key in rest) {
    const change = rest[key];
    if (meta && key in meta) {
      data[key] = meta[key].original;
    } else {
      undoUpdateImpl(data[key], change);
    }
  }
}