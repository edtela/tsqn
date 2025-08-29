import { ALL, WHERE, DEFAULT, CONTEXT, META } from "./symbols.js";

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

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
    ? { [K in keyof T]?: DeepPartial<T[K]> }
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
  [WHERE]?: (value: T, context?: Record<string, any>) => boolean;
  [DEFAULT]?: T;
  [CONTEXT]?: Record<string, any>;
};

// Main Update type
// - Functions require Replace<T> syntax
// - Routes to UpdateObject for objects (including null/undefined unions)
// - Routes to UpdateTerminal for primitives
// - Preserves null/undefined in unions
// - Allows Replace<T> for object types
// - Special handling for never, any, unknown
export type Update<T> = [T] extends [never]
  ? never  // never type stays never
  : unknown extends T
    ? any  // any type allows anything
    : [NonNullable<T>] extends [Function]
      ? Replace<NonNullable<T>>  // Functions must use replacement syntax
      : [NonNullable<T>] extends [object]
        ?
            | (undefined extends T ? undefined : never)
            | (null extends T ? null : never)
            | UpdateObject<NonNullable<T>>
            | Replace<NonNullable<T>>
        : UpdateTerminal<T>;

export type UpdateResult<T> = T extends readonly any[]
  ? {
      // For arrays, allow any string key (including numeric indices)
      [index: string]: T extends readonly (infer E)[] ? ([E] extends [object] ? UpdateResult<E> : E) : never;
      [META]?: { [index: string]: T extends readonly (infer E)[] ? UpdateResultMeta<E> : never };
    }
  : {
      // For objects, use StringKeys as before
      [K in StringKeys<T>]?: [T[K]] extends [object] ? UpdateResult<T[K]> : T[K];
    } & {
      [META]?: { [K in StringKeys<T>]?: UpdateResultMeta<T[K]> };
    };

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
export type Select<T> = T extends readonly any[] ? ArraySelect<T> : T extends object ? ObjectSelect<T> : never;

type ArraySelect<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [key: string]: boolean | Select<E>;
      [WHERE]?: (value: E) => boolean;
      [ALL]?: boolean | Select<E>;
    }
  : never;

type ObjectSelect<T extends object> = string extends keyof T
  ? RecordSelect<T> // Has string index signature
  : KnownKeysSelect<T>; // Regular object

type RecordSelect<T> = {
  [key: string]: boolean | Select<AllValueType<T>>;
  [WHERE]?: (value: T) => boolean;
  [ALL]?: boolean | Select<AllValueType<T>>;
};

type KnownKeysSelect<T extends object> = {
  [K in StringKeys<T>]?: boolean | Select<T[K]>;
} & {
  [WHERE]?: (value: T) => boolean;
  [ALL]?: boolean | Select<AllValueType<T>>;
};

export type SelectResult<T> = DeepPartial<T>;
