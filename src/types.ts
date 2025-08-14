import { ALL, WHERE, DEFAULT, CONTEXT, META } from "./symbols.js";

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// Helper to convert union to intersection (for ALL operator)
// This ensures ALL only allows updates to properties common across all types
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

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
// - Functions can only be replaced using [T] syntax
// - Other values can be direct assignment or replacement
// - For unions containing objects, [T] syntax is allowed
type UpdateTerminal<T> = [T] extends [Function]
  ? [T] // Functions must use replacement syntax
  : Extract<T, object> extends never
    ? T
    : [T];

// Update type for arrays
// - Allows partial updates by index (string keys)
// - Supports [ALL] to update all elements
// - Each update can be a value or function
type UpdateArray<T extends readonly any[]> = {
  [index: string]: T extends readonly (infer E)[]
    ? Update<E> | ((value: E, data: T, index: string, ctx?: Record<string, any>) => Update<E>)
    : never;
} & {
  [ALL]?: T extends readonly (infer E)[]
    ? Update<E> | ((value: E, data: T, index: number, ctx?: Record<string, any>) => Update<E>)
    : never;
};

// Update type for non-array objects
// - Each property can be updated with a value or function
// - Optional properties can be deleted with []
// - [ALL] updates all properties (type-safe intersection)
type UpdateNonArrayObject<T extends object> = {
  [K in StringKeys<T>]?:
    | Update<T[K]>
    | (IsOptional<T, K> extends true ? [] : never)
    | ((value: T[K], data: T, key: K, ctx?: Record<string, any>) => Update<T[K]>);
} & {
  [ALL]?:
    | Update<AllValueType<T>>
    | ((value: AllValueType<T>, data: T, key: keyof T, ctx?: Record<string, any>) => Update<AllValueType<T>>);
};

// Update type for objects (arrays and non-arrays)
// - Delegates to appropriate sub-type
// - WHERE predicate applies to the entire object
type UpdateObject<T extends object> = (T extends readonly any[] ? UpdateArray<T> : UpdateNonArrayObject<T>) & {
  [WHERE]?: (value: T, context?: Record<string, any>) => boolean;
  [DEFAULT]?: T;
  [CONTEXT]?: Record<string, any>;
};

// Main Update type
// - Routes to UpdateObject for objects (including null/undefined unions)
// - Routes to UpdateTerminal for primitives
// - Preserves null/undefined in unions
// - Allows [T] replacement for object types
export type Update<T> = [NonNullable<T>] extends [object]
  ?
      | (undefined extends T ? undefined : never)
      | (null extends T ? null : never)
      | UpdateObject<NonNullable<T>>
      | [NonNullable<T>]
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
