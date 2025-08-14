import { ALL, WHERE } from "./symbols.js";
import { Select, SelectResult } from "./types.js";

export function select<T>(data: T, stmt: Select<T>): SelectResult<T> | undefined {
  const result = selectImpl(data, stmt);
  return result === NO_RESULT ? undefined : result;
}

const NO_RESULT = Symbol();
export function selectImpl(data: any, stmt: Select<any>): SelectResult<any> | typeof NO_RESULT {
  const { [ALL]: all, [WHERE]: where, ...rest } = stmt;

  if (where && !where(data)) {
    return NO_RESULT;
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

export function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
  if (path.length === 0 || data === null || typeof data != "object" || Array.isArray(data)) {
    return data;
  }

  const [head, ...tail] = path;

  let result: any;
  if (typeof head === "string") {
    const value = selectByPath((data as any)[head], tail as any);
    if (value !== undefined) result = { [head]: value };
  } else if (head === ALL) {
    for (const key in data) {
      const value = selectByPath(data[key], tail as any);
      if (value !== undefined) {
        if (!result) {
          result = {};
        }
        result[key] = value;
      }
    }
  }

  return result;
}
