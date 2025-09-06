import { ALL, SOME, NOT, LT, GT, LTE, GTE, EQ, NEQ, MATCH } from "./symbols.js";
import { Predicate } from "./types.js";

const operators = [ALL, SOME, NOT, LT, GT, LTE, GTE, EQ, NEQ, MATCH];

export function evalPredicate<T>(value: T, predicate: Predicate<T>): boolean {
  if (predicate == null || typeof predicate !== "object") {
    return predicate === value;
  }

  if (Array.isArray(predicate)) {
    return predicate.some((pred) => evalPredicate(value, pred));
  }

  const result = operators.filter((op) => op in predicate).every((op: any) => testOperator(value, op, predicate[op]));
  if (result) {
    if (value == null || typeof value !== "object") {
      return Object.keys(predicate).filter((k) => k !== undefined).length === 0;
    }
    return Object.keys(predicate).every((key: any) => {
      if (key in value) {
        return evalPredicate(value[key], predicate[key]);
      }
      return false;
    });
  }
  return result;
}

export function testOperator(value: any, operator: symbol, condition: any): boolean {
  const valueType = typeof value;

  switch (operator) {
    // Operators that work for all types
    case EQ:
      return value == condition;
    case NEQ:
      return value != condition;

    // Type-specific operators
    case LT:
      return (valueType === "number" || valueType === "string") && value < condition;
    case GT:
      return (valueType === "number" || valueType === "string") && value > condition;
    case LTE:
      return (valueType === "number" || valueType === "string") && value <= condition;
    case GTE:
      return (valueType === "number" || valueType === "string") && value >= condition;

    case MATCH:
      if (valueType === "string") {
        try {
          const sc = toSearchCriteria(condition);
          return new RegExp(sc.pattern, sc.flags).test(value);
        } catch {
          console.error("Invalid regex pattern:", condition);
          return false;
        }
      }
      return false;
    case NOT:
      return !evalPredicate(value, condition);
    case ALL:
      if (value !== null && valueType === "object") {
        return Object.keys(value).every((key) => {
          if (key in value) {
            evalPredicate(value[key], condition);
          }
          return false;
        });
      }
      return false;
    case SOME:
      if (value !== null && valueType === "object") {
        return Object.keys(value).some((key) => {
          if (key in value) {
            evalPredicate(value[key], condition);
          }
          return false;
        });
      }
      return false;
  }
  return false;
}

function toSearchCriteria(inputString: string) {
  // Check if the string is in the /pattern/flags format.
  // It must start with a slash and have another slash later on.
  if (inputString.startsWith("/") && inputString.lastIndexOf("/") > 0) {
    const lastSlashIndex = inputString.lastIndexOf("/");

    const pattern = inputString.substring(1, lastSlashIndex);
    const flags = inputString.substring(lastSlashIndex + 1);

    return { pattern, flags };
  } else {
    // If not, the entire string is the pattern and there are no flags.
    return { pattern: inputString, flags: "" };
  }
}
