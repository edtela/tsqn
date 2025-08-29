import { Update, UpdateResult, META } from "../src/index.js";

// Type assertion utilities
type Expect<T extends true> = T;
type Equal<X, Y> = 
  (<T>() => T extends X ? 1 : 2) extends 
  (<T>() => T extends Y ? 1 : 2) ? true : false;
type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

// Test helper to check if a type is assignable
type IsAssignable<T, U> = T extends U ? true : false;

// ============================================
// UpdateTerminal Tests - Primitive Types
// ============================================

// Pure primitive types should allow direct assignment
type PrimitiveString = Update<string>;
type TestPrimitiveString = Expect<Equal<PrimitiveString, string>>;

type PrimitiveNumber = Update<number>;
type TestPrimitiveNumber = Expect<Equal<PrimitiveNumber, number>>;

type PrimitiveBoolean = Update<boolean>;
type TestPrimitiveBoolean = Expect<Equal<PrimitiveBoolean, boolean>>;

// ============================================
// UpdateTerminal Tests - Function Types
// ============================================

// Functions must use replacement syntax [T]
type FunctionType = Update<() => void>;
// Pure functions should be exactly [T]
type TestFunctionType = Expect<Equal<FunctionType, [() => void]>>;

type FunctionWithArgs = Update<(x: number) => string>;
type TestFunctionWithArgs = Expect<Equal<FunctionWithArgs, [(x: number) => string]>>;

// ============================================
// UpdateTerminal Tests - Mixed Unions
// ============================================

// Mixed union: string | object should allow both direct string and [object]
type MixedUnion = Update<string | { name: string }>;

// Test that string can be assigned directly
type CanAssignString = Expect<IsAssignable<string, MixedUnion>>;

// Test that object requires brackets
type CanAssignBracketedObject = Expect<IsAssignable<[{ name: string }], MixedUnion>>;

// Bracketed primitives are not needed and not part of the type
// (unlike objects which require brackets to distinguish from update statements)

// Complex mixed union
type ComplexMixedUnion = Update<string | number | { value: number } | boolean>;

// All primitives should be directly assignable
type TestComplexString = Expect<IsAssignable<string, ComplexMixedUnion>>;
type TestComplexNumber = Expect<IsAssignable<number, ComplexMixedUnion>>;
type TestComplexBoolean = Expect<IsAssignable<boolean, ComplexMixedUnion>>;

// Object needs brackets
type TestComplexObject = Expect<IsAssignable<[{ value: number }], ComplexMixedUnion>>;

// ============================================
// Update Tests - Object Types
// ============================================

interface User {
  name: string;
  age: number;
  profile?: {
    bio: string;
    avatar?: string;
  };
}

type UserUpdate = Update<User>;

// Test partial updates
type PartialUserUpdate = {
  name?: string;
  age?: number;
  profile?: {
    bio?: string;
    avatar?: string | [];
  } | [];
};

// Test that partial updates are valid
type TestPartialUpdate = Expect<IsAssignable<PartialUserUpdate, UserUpdate>>;

// Test full replacement
type TestFullReplacement = Expect<IsAssignable<[User], UserUpdate>>;

// ============================================
// Update Tests - Array Types
// ============================================

type NumberArray = Update<number[]>;

// Test index updates
type TestArrayIndex = Expect<IsAssignable<{ "0": number }, NumberArray>>;

// Test ALL operator (imported from symbols)
import { ALL } from "../src/index.js";
type TestArrayAll = Expect<IsAssignable<{ [ALL]: number }, NumberArray>>;

// ============================================
// Update Tests - Nullable/Undefined Types
// ============================================

type NullableString = Update<string | null>;

// Should accept null
type TestNullableNull = Expect<IsAssignable<null, NullableString>>;

// Should accept string directly
type TestNullableString = Expect<IsAssignable<string, NullableString>>;

type OptionalUser = Update<User | undefined>;

// Should accept undefined
type TestOptionalUndefined = Expect<IsAssignable<undefined, OptionalUser>>;

// Should accept partial updates
type TestOptionalPartial = Expect<IsAssignable<{ name: string }, OptionalUser>>;

// ============================================
// Update Tests - Record Types
// ============================================

type StringRecord = Update<Record<string, string>>;

// Should allow any string key
type TestRecordKey = Expect<IsAssignable<{ anyKey: string }, StringRecord>>;

// Should allow ALL operator
type TestRecordAll = Expect<IsAssignable<{ [ALL]: string }, StringRecord>>;

type MixedRecord = Update<Record<string, string | { value: number }>>;

// Primitives direct, objects bracketed
type TestMixedRecordString = Expect<IsAssignable<{ key: string }, MixedRecord>>;
type TestMixedRecordObject = Expect<IsAssignable<{ key: [{ value: number }] }, MixedRecord>>;

// ============================================
// UpdateResult Tests
// ============================================

type UserResult = UpdateResult<User>;

// Should have optional properties with potential META
type ExpectedUserResult = {
  name?: string;
  age?: number;
  profile?: UpdateResult<NonNullable<User["profile"]>>;
} & {
  [META]?: {
    name?: { original: string };
    age?: { original: number };
    profile?: { original: User["profile"] };
  };
};

// Test that the result type matches expectations
type TestUserResult = Expect<IsAssignable<ExpectedUserResult, UserResult>>;

// ============================================
// Complex Nested Update Tests
// ============================================

interface AppState {
  user: User;
  settings: {
    theme: "light" | "dark";
    notifications: boolean;
  };
  data: (string | { id: number; value: string })[];
}

type AppStateUpdate = Update<AppState>;

// Test complex nested update
type ComplexUpdate = {
  user?: {
    name?: string;
    profile?: [{ bio: string; avatar: string }]; // Full replacement
  };
  settings?: {
    theme?: "light" | "dark";
  };
  data?: {
    "0"?: string | [{ id: number; value: string }]; // Mixed union in array
    [ALL]?: string | [{ id: number; value: string }];
  };
};

type TestComplexUpdate = Expect<IsAssignable<ComplexUpdate, AppStateUpdate>>;

// ============================================
// Edge Cases
// ============================================

// Function in union with primitive
type FunctionUnion = Update<string | (() => void)>;

// String should be direct
type TestFunctionUnionString = Expect<IsAssignable<string, FunctionUnion>>;

// Function needs brackets
type TestFunctionUnionFunction = Expect<IsAssignable<[() => void], FunctionUnion>>;

// Triple union: primitive | object | function
type TripleUnion = Update<number | { x: number } | (() => number)>;

type TestTripleNumber = Expect<IsAssignable<number, TripleUnion>>;
type TestTripleObject = Expect<IsAssignable<[{ x: number }], TripleUnion>>;
type TestTripleFunction = Expect<IsAssignable<[() => number], TripleUnion>>;

// Empty object
type EmptyObject = Update<{}>;
type TestEmptyObject = Expect<IsAssignable<{}, EmptyObject>>;
type TestEmptyObjectReplacement = Expect<IsAssignable<[{}], EmptyObject>>;

// Never type
type NeverUpdate = Update<never>;
type TestNever = Expect<Equal<NeverUpdate, never>>;

// Any type (should preserve flexibility)
type AnyUpdate = Update<any>;
// Any should accept anything
type TestAnyString = Expect<IsAssignable<string, AnyUpdate>>;
type TestAnyObject = Expect<IsAssignable<{ x: 1 }, AnyUpdate>>;
type TestAnyBracketed = Expect<IsAssignable<[{ x: 1 }], AnyUpdate>>;

// Unknown type
type UnknownUpdate = Update<unknown>;
// Unknown is treated as potentially an object, so both forms should work
type TestUnknownDirect = Expect<IsAssignable<"test", UnknownUpdate>>;
type TestUnknownBracketed = Expect<IsAssignable<[{ x: 1 }], UnknownUpdate>>;