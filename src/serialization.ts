/**
 * JSON Serialization for tsqn
 * 
 * Provides functions to serialize and deserialize tsqn statements
 * containing symbols to/from JSON format.
 * 
 * Symbols are converted to their string descriptions for serialization.
 * Functions in statements will throw a SerializationError.
 */

import { 
  ALL, DEEP_ALL, WHERE, DEFAULT, CONTEXT, META,
  LT, GT, LTE, GTE, EQ, NEQ, NOT, MATCH, SOME 
} from './symbols.js';

/**
 * Custom error for serialization issues
 */
export class SerializationError extends Error {
  constructor(message: string, public path?: string[]) {
    super(path ? `${message} at path: ${path.join('.')}` : message);
    this.name = 'SerializationError';
  }
}

/**
 * Map symbols to their string descriptions
 */
const symbolToString = new Map<symbol, string>([
  [ALL, "*"],
  [DEEP_ALL, "**"],
  [WHERE, "?"],
  [DEFAULT, "{}"],
  [CONTEXT, "$"],
  [META, "#"],
  [LT, "<"],
  [GT, ">"],
  [LTE, "<="],
  [GTE, ">="],
  [EQ, "=="],
  [NEQ, "!="],
  [NOT, "!"],
  [MATCH, "~"],
  [SOME, "|"]
]);

/**
 * Reverse map for deserialization
 */
const stringToSymbol = new Map<string, symbol>(
  Array.from(symbolToString.entries()).map(([k, v]) => [v, k])
);

/**
 * Check if a value is a plain object (not array, null, or other types)
 */
function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Convert a statement with symbols to JSON-serializable format
 * 
 * @param statement - The tsqn statement to serialize
 * @param path - Internal parameter for tracking object path in error messages
 * @returns JSON-serializable version of the statement
 * @throws SerializationError if functions are found
 */
export function toJSON(statement: any, path: string[] = []): any {
  // Check for functions
  if (typeof statement === 'function') {
    throw new SerializationError('Cannot serialize functions', path);
  }

  // Handle primitives (null, undefined, string, number, boolean)
  if (statement === null || statement === undefined || 
      typeof statement === 'string' || 
      typeof statement === 'number' || 
      typeof statement === 'boolean') {
    return statement;
  }

  // Handle arrays
  if (Array.isArray(statement)) {
    return statement.map((item, index) => 
      toJSON(item, [...path, String(index)])
    );
  }

  // Handle objects
  if (isPlainObject(statement)) {
    const result: any = {};
    
    for (const key of Reflect.ownKeys(statement)) {
      const value = statement[key];
      
      // Convert symbol keys to strings
      if (typeof key === 'symbol') {
        const stringKey = symbolToString.get(key);
        if (stringKey !== undefined) {
          result[stringKey] = toJSON(value, [...path, stringKey]);
        } else {
          // Unknown symbol - skip it (could throw error instead)
          console.warn(`Unknown symbol key encountered: ${key.toString()}`);
        }
      } else {
        // Regular string/number key
        const keyStr = String(key);
        result[keyStr] = toJSON(value, [...path, keyStr]);
      }
    }
    
    return result;
  }

  // Other types (Date, RegExp, etc.) - pass through
  // Note: These may not serialize correctly to JSON, but we'll let JSON.stringify handle them
  return statement;
}

/**
 * Convert JSON back to statement with symbols
 * 
 * @param json - The JSON object to deserialize
 * @param path - Internal parameter for tracking object path in error messages
 * @returns Statement with symbols restored
 * @throws SerializationError if functions are found
 */
export function fromJSON(json: any, path: string[] = []): any {
  // Check for functions (shouldn't happen in valid JSON, but be safe)
  if (typeof json === 'function') {
    throw new SerializationError('Functions are not allowed in deserialized data', path);
  }

  // Handle primitives
  if (json === null || json === undefined || 
      typeof json === 'string' || 
      typeof json === 'number' || 
      typeof json === 'boolean') {
    return json;
  }

  // Handle arrays
  if (Array.isArray(json)) {
    return json.map((item, index) => 
      fromJSON(item, [...path, String(index)])
    );
  }

  // Handle objects
  if (isPlainObject(json)) {
    const result: any = {};
    
    for (const key in json) {
      if (json.hasOwnProperty(key)) {
        const value = json[key];
        
        // Check if this key should be converted to a symbol
        const symbol = stringToSymbol.get(key);
        if (symbol !== undefined) {
          result[symbol] = fromJSON(value, [...path, key]);
        } else {
          // Regular key
          result[key] = fromJSON(value, [...path, key]);
        }
      }
    }
    
    return result;
  }

  // Other types - pass through
  return json;
}

/**
 * Validate that a statement contains no functions
 * 
 * @param statement - The statement to validate
 * @param path - Internal parameter for tracking object path
 * @returns true if valid (no functions), throws otherwise
 * @throws SerializationError if functions are found
 */
export function validateNoFunctions(statement: any, path: string[] = []): boolean {
  if (typeof statement === 'function') {
    throw new SerializationError('Functions are not allowed', path);
  }

  if (Array.isArray(statement)) {
    statement.forEach((item, index) => 
      validateNoFunctions(item, [...path, String(index)])
    );
  } else if (isPlainObject(statement)) {
    for (const key of Reflect.ownKeys(statement)) {
      const keyStr = typeof key === 'symbol' ? 
        symbolToString.get(key) || key.toString() : 
        String(key);
      validateNoFunctions(statement[key], [...path, keyStr]);
    }
  }

  return true;
}