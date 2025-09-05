// Export symbols
export { 
  ALL, DEEP_ALL, WHERE, DEFAULT, CONTEXT, META,
  LT, GT, LTE, GTE, EQ, NEQ, NOT, MATCH, SOME
} from './symbols.js';

// Export types
export type {
  Update,
  UpdateResult,
  UpdateResultMeta,
  DataChange,
  ChangeDetector,
  ChangeDetectorFn,
  Select,
  SelectResult,
  Delete,
  Replace,
  Predicate
} from './types.js';

// Export update, undo, and transaction functionality
export { update, undo, transaction } from './update.js';

// Export select functionality
export { select } from './select.js';

// Export change detection
export { hasChanges, anyChange, typeChange } from './change-detection.js';

// Export predicate functionality
export { evalPredicate } from './predicate.js';

// Export serialization functionality
export { toJSON, fromJSON, SerializationError, validateNoFunctions } from './serialization.js';