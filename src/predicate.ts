import {
  ALL, SOME, NOT,
  LT, GT, LTE, GTE, EQ, NEQ, MATCH
} from "./symbols.js";
import { Predicate } from "./types.js";

/**
 * Evaluates a predicate against a value
 * @param value The value to test
 * @param predicate The predicate to evaluate
 * @returns true if the predicate matches, false otherwise
 */
export function evalPredicate<T>(value: T, predicate: Predicate<T>): boolean {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (predicate === value) return true; // Direct equality
    if (predicate && typeof predicate === 'object' && !Array.isArray(predicate)) {
      if (EQ in predicate) return predicate[EQ] == value;
      if (NEQ in predicate) return predicate[NEQ] != value;
      if (NOT in predicate) return predicate[NOT] !== value;
    }
    return false;
  }

  // Handle OR predicates (arrays at root level)
  if (Array.isArray(predicate)) {
    // Empty OR = FALSE
    if (predicate.length === 0) return false;
    // At least one must match
    return predicate.some(p => evalPredicate(value, p));
  }

  // Handle objects and arrays predicates
  if (typeof predicate === 'object' && predicate !== null && !Array.isArray(predicate)) {
    // Empty AND = TRUE
    const predicateKeys = Object.keys(predicate);
    const symbolKeys = Object.getOwnPropertySymbols(predicate);
    if (predicateKeys.length === 0 && symbolKeys.length === 0) return true;

    // For primitive values, evaluate as terminal with operators
    if (typeof value !== 'object' || value === null) {
      return evalTerminal(value, predicate);
    }

    // Handle NOT
    if (NOT in predicate) {
      const notPred = predicate[NOT];
      if (!evalPredicate(value, notPred as any)) {
        // NOT condition passed, check other conditions
        const { [NOT]: _, ...rest } = predicate;
        if (Object.keys(rest).length === 0 && Object.getOwnPropertySymbols(rest).length === 0) {
          return true; // Only NOT condition
        }
        return evalPredicate(value, rest as any);
      }
      return false;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return evalArray(value, predicate);
    }

    // Handle objects
    return evalObject(value, predicate);
  }

  // Direct equality check for non-object predicates
  return value === predicate;
}

function evalTerminal(value: any, predicate: any): boolean {
  // Direct equality
  if (value === predicate) return true;

  // Not an operator object
  if (typeof predicate !== 'object' || predicate === null || Array.isArray(predicate)) {
    return false;
  }

  // Check operators based on value type
  const valueType = typeof value;

  // Operators that work for all types
  if (EQ in predicate) return value == predicate[EQ];
  if (NEQ in predicate) return value != predicate[NEQ];
  if (NOT in predicate) return value !== predicate[NOT];

  // Type-specific operators
  if (valueType === 'number' || valueType === 'string') {
    if (LT in predicate) return value < predicate[LT];
    if (GT in predicate) return value > predicate[GT];
    if (LTE in predicate) return value <= predicate[LTE];
    if (GTE in predicate) return value >= predicate[GTE];
  }

  if (valueType === 'string') {
    if (MATCH in predicate) {
      try {
        return new RegExp(predicate[MATCH]).test(value);
      } catch {
        return false;
      }
    }
  }

  return false;
}

function evalArray(arr: any[], predicate: any): boolean {
  const { [ALL]: all, [SOME]: some, ...indices } = predicate;

  // Check ALL condition
  if (all !== undefined) {
    if (!arr.every(item => evalPredicate(item, all))) {
      return false;
    }
  }

  // Check SOME condition
  if (some !== undefined) {
    if (!arr.some(item => evalPredicate(item, some))) {
      return false;
    }
  }

  // Check specific indices
  for (const key in indices) {
    const index = parseInt(key, 10);
    if (!isNaN(index) && index >= 0 && index < arr.length) {
      if (!evalPredicate(arr[index], indices[key])) {
        return false;
      }
    }
  }

  return true;
}

function evalObject(obj: any, predicate: any): boolean {
  const { [ALL]: all, [SOME]: some, [NOT]: not, ...properties } = predicate;

  // Check ALL condition
  if (all !== undefined) {
    for (const key in obj) {
      if (!evalPredicate(obj[key], all)) {
        return false;
      }
    }
  }

  // Check SOME condition  
  if (some !== undefined) {
    let foundMatch = false;
    for (const key in obj) {
      if (evalPredicate(obj[key], some)) {
        foundMatch = true;
        break;
      }
    }
    if (!foundMatch) return false;
  }

  // Check specific properties
  for (const key in properties) {
    if (!(key in obj)) {
      // Property doesn't exist
      const propPred = properties[key];
      // Check if predicate accepts null/undefined
      if (!evalPredicate(undefined, propPred)) {
        return false;
      }
    } else if (!evalPredicate(obj[key], properties[key])) {
      return false;
    }
  }

  return true;
}