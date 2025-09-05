import { ALL, DEEP_ALL, WHERE } from "./symbols.js";
import { Select, SelectResult } from "./types.js";
import { evalPredicate } from "./predicate.js";

export function select<T>(data: T, stmt: Select<T>): SelectResult<T> | undefined {
  const result = selectImpl(data, stmt);
  return result === NO_RESULT ? undefined : result;
}

const NO_RESULT = Symbol();
export function selectImpl(data: any, stmt: Select<any>): SelectResult<any> | typeof NO_RESULT {
  const { [DEEP_ALL]: deepAll, [ALL]: all, [WHERE]: where, ...rest } = stmt as any;

  // Handle DEEP_ALL operator
  if (deepAll !== undefined) {
    // Check if pattern matches at current level
    if (evaluateDeepPattern(data, deepAll)) {
      // For primitive patterns, just return the value
      if (typeof deepAll !== 'object' || deepAll === null) {
        return data;
      }
      
      // For object patterns, apply selection (minus WHERE)
      const { [WHERE]: _, ...selection } = deepAll;
      
      // If only WHERE was specified, return the whole value
      if (Object.keys(selection).length === 0) {
        return data;
      }
      
      // Apply the selection
      return selectImpl(data, selection);
    }
    
    // Pattern doesn't match - recurse if possible
    if (typeof data === 'object' && data !== null) {
      return selectImpl(data, { [ALL]: { [DEEP_ALL]: deepAll } });
    }
    
    return NO_RESULT;
  }

  if (where) {
    // Check if it's a function or a predicate
    const whereResult = typeof where === 'function'
      ? where(data)
      : evalPredicate(data, where);
    
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

/**
 * Evaluate if a deep pattern matches the current data
 */
function evaluateDeepPattern(data: any, pattern: any): boolean {
  // Pattern is 'true' - always matches (terminal selection)
  if (pattern === true) {
    return true;
  }
  
  // Primitive value match
  if (typeof pattern === 'string' || typeof pattern === 'number' || typeof pattern === 'boolean') {
    return data === pattern;
  }
  
  // Null match
  if (pattern === null) {
    return data === null;
  }
  
  // Pattern must be an object at this point
  if (typeof pattern !== 'object' || pattern === null) {
    return false;
  }
  
  // If pattern has WHERE, it decides the match
  if (pattern[WHERE]) {
    const whereResult = typeof pattern[WHERE] === 'function'
      ? pattern[WHERE](data)
      : evalPredicate(data, pattern[WHERE]);
    return whereResult;
  }
  
  // No WHERE - check if all non-symbol keys exist in data
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const patternKeys = Object.keys(pattern).filter(k => typeof k === 'string');
    
    // Pattern applies if ALL pattern keys exist in data
    return patternKeys.length > 0 && patternKeys.every(key => key in data);
  }
  
  return false;
}
