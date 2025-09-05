import { 
  ALL, DEEP_ALL, WHERE, DEFAULT, CONTEXT, META,
  LT, GT, LTE, GTE, EQ, NEQ, NOT, MATCH, SOME 
} from "./symbols.js";

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// Helper type to check if T is an object but not a function
type IsObjectButNotFunction<T> = [T] extends [object] 
  ? [T] extends [Function] ? false : true 
  : false;

// Helper to extract nullable parts of a union type
type NullableParts<T> = (undefined extends T ? undefined : never) | (null extends T ? null : never);

// Helper to convert union to intersection (for ALL operator)
// This ensures ALL only allows updates to properties common across all types
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

// Function that transforms a value during update
type UpdateFunction<TValue, TData, TKey = string> = 
  (value: TValue, data: TData, key: TKey, ctx?: Record<string, any>) => Update<TValue>;

// Deletion marker for removing optional properties
export type Delete = [];

// Full replacement syntax (distinguishes from partial updates)
// Only for object types (including functions) that need bracket syntax
export type Replace<T extends object> = [T];

// Helper to get the value type for ALL operator
// - For arrays: the element type
// - For objects: intersection of all value types
type AllValueType<T> = T extends readonly any[] ? T[number] : UnionToIntersection<T[keyof T]>;

type DeepPartial<T> = T extends readonly any[]
  ? T // Arrays remain arrays (just filtered)
  : T extends object
    ? string extends keyof T
      ? T extends Record<string, infer V>
        ? Record<string, DeepPartial<V>> // Record types get deep partial values
        : T
      : { [K in keyof T]?: DeepPartial<T[K]> } // Regular objects get partial
    : T;

export type DataChange<T> = UpdateResult<T>;

// Terminal update types - for non-object values
// - Functions can only be replaced using Replace<T> syntax
// - Objects require Replace<T> syntax to distinguish from update statements
// - Primitives can use direct assignment
// - Mixed unions: each type follows its own rule
type UpdateTerminal<T> = [T] extends [Function]
  ? Replace<T>  // Pure functions must use replacement syntax
  : T extends Function
    ? Replace<T> | Exclude<T, Function>  // Function in union: function needs brackets, rest doesn't
    : T extends object
      ? Replace<T> | Exclude<T, object>   // Object in union: object needs brackets, primitives don't
      : T;                                 // Pure primitives: direct assignment

// Update type for arrays
// - Allows partial updates by numeric index (positive and negative)
// - Supports [ALL] to update all elements
// - Each update can be a value or function
type UpdateArray<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [index: string]: Update<E> | UpdateFunction<E, T, number>;
      [ALL]?: Update<E> | UpdateFunction<E, T, number>;
    }
  : never;

// Update type for Record types with string index signatures
// - Allows any string key for dynamic updates
// - Supports value updates, functions, and deletions
// - [ALL] updates all properties with the same value/function
// - Uses the value type V directly (not intersection like AllValueType)
type UpdateRecord<T> = T extends Record<string, infer V>
  ? {
      [key: string]:
        | Update<V>
        | Delete
        | UpdateFunction<V, T, string>;
    } & {
      [ALL]?:
        | Update<V>
        | UpdateFunction<V, T, string>;
    }
  : never;

// Update type for objects with known/fixed keys (not index signatures)
// - Each property can be updated with a value or function
// - Optional properties can be deleted with Delete
// - [ALL] updates all properties (type-safe intersection)
type UpdateKnownKeys<T extends object> = {
  [K in StringKeys<T>]?:
    | Update<T[K]>
    | (IsOptional<T, K> extends true ? Delete : never)
    | UpdateFunction<T[K], T, K>;
} & {
  [ALL]?:
    | Update<AllValueType<T>>
    | UpdateFunction<AllValueType<T>, T, keyof T>;
};

// Update type for objects (arrays and non-arrays)
// - Routes to UpdateArray for arrays
// - Routes to UpdateRecord for Record types with string index signatures
// - Routes to UpdateKnownKeys for regular objects with fixed keys
// - WHERE predicate applies to the entire object
type UpdateObject<T extends object> = (T extends readonly any[]
  ? UpdateArray<T>
  : string extends keyof T
    ? UpdateRecord<T>
    : UpdateKnownKeys<T>) & {
  [WHERE]?: ((value: T, context?: Record<string, any>) => boolean) | Predicate<T>;
  [DEFAULT]?: T;
  [CONTEXT]?: Record<string, any>;
};

// Main Update type - Two-route model:
// - Object route: arrays, plain objects, Records (via UpdateObject)  
// - Non-object route: primitives, functions, mixed unions (via UpdateTerminal)
// - Special handling for any, unknown, never
// - Preserves null/undefined in unions
export type Update<T> = [T] extends [never]
  ? never  // never stays never (avoids Replace<never> constraint issue)
  : unknown extends T 
    ? [T] extends [{}]
      ? unknown  // unknown returns unknown (preserves type safety)
      : any      // any returns any (preserves flexibility)
    : IsObjectButNotFunction<NonNullable<T>> extends true
      ? NullableParts<T> | UpdateObject<NonNullable<T>> | Replace<NonNullable<T>>
      : UpdateTerminal<T>;  // Handles functions, primitives, and mixed unions

// UpdateResult type for arrays
type UpdateResultArray<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [index: string]: [E] extends [object] ? UpdateResult<E> : E;
      [META]?: { [index: string]: UpdateResultMeta<E> };
    }
  : never;

// UpdateResult type for Record types with string index signatures
type UpdateResultRecord<T> = T extends Record<string, infer V>
  ? {
      [key: string]: [V] extends [object] ? UpdateResult<V> : V;
      [META]?: { [key: string]: UpdateResultMeta<V> };
    }
  : never;

// UpdateResult type for objects with known/fixed keys
type UpdateResultKnownKeys<T extends object> = {
  [K in StringKeys<T>]?: [NonNullable<T[K]>] extends [object] ? UpdateResult<T[K]> : T[K];
} & {
  [META]?: { [K in StringKeys<T>]?: UpdateResultMeta<T[K]> };
};

// Helper to determine the base result type for an object
type BaseResultType<T extends object> = T extends readonly any[]
  ? UpdateResultArray<T>
  : string extends keyof T
    ? UpdateResultRecord<T>
    : UpdateResultKnownKeys<T>;

// Main UpdateResult type - matches Update's routing pattern
export type UpdateResult<T> = [T] extends [never]
  ? never
  : unknown extends T
    ? any  // Results of any/unknown updates are any
    : [NonNullable<T>] extends [object]
      ? undefined extends T
        ? BaseResultType<NonNullable<T>> | undefined  // Handle optional objects
        : BaseResultType<NonNullable<T>>  // Non-optional objects
      : T;  // Primitives and functions return as-is

export type UpdateResultMeta<T> = {
  original: T;
};

// Change detector function type
export type ChangeDetectorFn<T> = (key: string, result?: UpdateResult<T>) => boolean;

// Helper type for array change detectors
type ArrayChangeDetector<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [index: string]: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
    } & {
      [ALL]?: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
    }
  : never;

// Helper type for object change detectors
type ObjectChangeDetector<T extends object> = {
  [K in StringKeys<T>]?: ChangeDetectorFn<T> | ([T[K]] extends [object] ? ChangeDetector<T[K]> : never);
} & {
  [ALL]?: ChangeDetectorFn<T> | ChangeDetector<AllValueType<T>>;
};

// Main ChangeDetector type
export type ChangeDetector<T> = T extends readonly any[]
  ? ArrayChangeDetector<T>
  : T extends object
    ? ObjectChangeDetector<T>
    : never;

//SELECT
export type SelectPrimitive<T> = {
  [key: string]: any; // Allow string indexing for compatibility
  [WHERE]?: ((value: T) => boolean) | Predicate<T>;
  [ALL]?: never;
  [DEEP_ALL]?: never;
};

export type Select<T> = T extends readonly any[] ? SelectArray<T> : T extends object ? SelectObject<T> : SelectPrimitive<T>;

type SelectArray<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [key: string]: boolean | Select<E>;
      [WHERE]?: ((value: E) => boolean) | Predicate<E>;
      [ALL]?: boolean | Select<E>;
      [DEEP_ALL]?: boolean | Select<any>;
    }
  : never;

type SelectObject<T extends object> = string extends keyof T
  ? SelectRecord<T> // Has string index signature
  : SelectKnownKeys<T>; // Regular object

type SelectRecord<T> = {
  [key: string]: boolean | Select<AllValueType<T>>;
  [WHERE]?: ((value: T) => boolean) | Predicate<T>;
  [ALL]?: boolean | Select<AllValueType<T>>;
  [DEEP_ALL]?: boolean | Select<any>;
};

type SelectKnownKeys<T extends object> = {
  [K in StringKeys<T>]?: boolean | Select<T[K]>;
} & {
  [WHERE]?: ((value: T) => boolean) | Predicate<T>;
  [ALL]?: boolean | Select<AllValueType<T>>;
  [DEEP_ALL]?: boolean | Select<any>;
};

export type SelectResult<T> = DeepPartial<T>;

// PREDICATES

// Base AND predicates - type-specific operations that naturally combine with AND
type AndPredicate<T> = T extends readonly any[]
  ? {
      // Array-specific predicates (no direct array matching - arrays are for OR)
      [index: string]: Predicate<T[number]>;
      [ALL]?: Predicate<T[number]>;
      [SOME]?: Predicate<T[number]>;
      [EQ]?: T | null;
      [NEQ]?: T | null;
    }
  : T extends object
    ? (
        | T  // Direct object matching
        | ({
            // Object-specific predicates
            [K in StringKeys<T>]?: Predicate<T[K]>;
          } & {
            [ALL]?: Predicate<AllValueType<T>>;
            [SOME]?: Predicate<AllValueType<T>>;
            [EQ]?: T | null;
            [NEQ]?: T | null;
          })
      )
    : // Primitive predicates - combine all operations
      | T  // Direct value
      | {
          [EQ]?: T | null;
          [NEQ]?: T | null;
          [LT]?: T;
          [GT]?: T;
          [LTE]?: T;
          [GTE]?: T;
          [MATCH]?: T extends string ? string : never;
        };

// Logical NOT predicate
type NotPredicate<T> = {
  [NOT]?: Predicate<T>;
};

// Logical OR predicate (arrays)
type OrPredicate<T> = Predicate<T>[];

// Main Predicate type with boolean logic operations
export type Predicate<T> = [T] extends [never]
  ? never
  : unknown extends T
    ? any  // Predicate for unknown is any
    : (
        | (AndPredicate<NonNullable<T>> & NotPredicate<NonNullable<T>>)  // AND with optional NOT
        | OrPredicate<NonNullable<T>>                                     // OR
      ) | NullableParts<T>;  // Allow null/undefined for nullable types
