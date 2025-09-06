import { ALL, DEEP_ALL, NOT, WHERE } from "./symbols.js";
import { Select, SelectResult } from "./types.js";
import { evalPredicate } from "./predicate.js";

export function select<T>(data: T, stmt: Select<T>): SelectResult<T> | undefined {
  const result = selectImpl(data, stmt);
  return result === NO_RESULT ? undefined : result;
}

const NO_RESULT = Symbol();
export function selectImpl(data: any, stmt: Select<any>): SelectResult<any> | typeof NO_RESULT {
  const { [DEEP_ALL]: deepAll, [ALL]: all, [WHERE]: where, ...rest } = stmt as any;

  if (where) {
    // Check if it's a function or a predicate
    const whereResult = typeof where === "function" ? where(data) : evalPredicate(data, where);

    if (!whereResult) {
      return NO_RESULT;
    }
  }

  if (data == null || typeof data !== "object") {
    return data;
  }

  let result: any = NO_RESULT;
  function addToResult(key: string, keyStmt: any) {
    if (Array.isArray(data)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        return;
      }
    }

    let keyValue = NO_RESULT;
    if (keyStmt === true) {
      keyValue = data[key];
    } else if (keyStmt != null && typeof keyStmt === "object") {
      keyValue = selectImpl(data[key], keyStmt);
    }

    if (keyValue !== NO_RESULT) {
      if (result == NO_RESULT) {
        result = Array.isArray(data) ? [] : {};
      }
      result[key] = keyValue;
    }
  }

  if (deepAll) {
    for (const key in data) {
      const value = data[key];
      if (value == null || typeof value !== "object") {
        if (deepAll[WHERE]) {
          addToResult(key, deepAll);
        }
      } else {
        let predicate = deepAll[WHERE];
        if (!predicate) {
          predicate = Object.keys(deepAll).reduce((acc, key) => {
            acc[key] = { [NOT]: undefined };
            return acc;
          }, {} as any);
        }
        const passes = typeof predicate === "function" ? predicate(value) : evalPredicate(value, predicate);
        if (passes) {
          addToResult(key, deepAll);
        } else {
          addToResult(key, { [DEEP_ALL]: deepAll });
        }
      }
    }
  }

  if (all) {
    for (const key in data) {
      addToResult(key, all);
    }
  }

  if (Array.isArray(result) && result.length > 0) {
    result = result.filter((v, i) => i in result);
  }

  for (const key in rest) {
    addToResult(key, rest[key]);
  }

  return result;
}

/** USES T and Object.keys()
export function selectImplTS<T>(data: T, stmt: Select<T>): SelectResult<T> | typeof NO_RESULT {
  const { [DEEP_ALL]: deepAll, [ALL]: all, [WHERE]: where, ...rest } = stmt as any;

  if (where) {
    const whereResult = typeof where === "function" ? where(data) : evalPredicate(data, where as any);
    if (!whereResult) {
      return NO_RESULT;
    }
  }

  if (data == null || typeof data !== "object") {
    return data as SelectResult<T>;
  }

  let result: SelectResult<T> | typeof NO_RESULT = NO_RESULT;

  function addToResult(key: keyof T, keyStmt: any) {
    if (Array.isArray(data)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        return;
      }
    }

    let keyValue: any | typeof NO_RESULT = NO_RESULT;
    if (keyStmt === true) {
      keyValue = data[key];
    } else if (keyStmt != null && typeof keyStmt === "object") {
      keyValue = selectImplTS(data[key], keyStmt);
    }

    if (keyValue !== NO_RESULT) {
      if (result === NO_RESULT) {
        result = (Array.isArray(data) ? [] : {}) as SelectResult<T>;
      }
      (result as any)[key] = keyValue;
    }
  }

  if (deepAll) {
    for (const key of Object.keys(data) as (keyof T)[]) {
      const value = data[key];
      if (value == null || typeof value !== "object") {
        addToResult(key, deepAll);
      } else {
        let predicate = (deepAll as any)[WHERE];
        if (!predicate) {
          predicate = Object.keys(deepAll).reduce((acc, k) => {
            (acc as any)[k] = { [NOT]: undefined };
            return acc;
          }, {});
        }
        const passes = typeof predicate === "function" ? predicate(value) : evalPredicate(value, predicate);
        if (passes) {
          addToResult(key, deepAll);
        } else {
          addToResult(key, { [DEEP_ALL]: deepAll });
        }
      }
    }
  }

  if (all) {
    for (const key of Object.keys(data) as (keyof T)[]) {
      addToResult(key, all);
    }
  }

  if (Array.isArray(result) && result.length > 0) {
    const r = result;
    result = result.filter((v, i) => i in r) as SelectResult<T>;
  }

  for (const key of Object.keys(rest) as (keyof T)[]) {
    addToResult(key, rest[key]);
  }

  return result;
}
*/
