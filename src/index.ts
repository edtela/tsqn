// Export symbols
export { ALL, WHERE, DEFAULT, CONTEXT, META } from './symbols.js';

// Export types
export type {
  Update,
  UpdateResult,
  UpdateResultMeta,
  DataChange,
  ChangeDetector,
  ChangeDetectorFn
} from './types.js';

// Export update functionality
export { update } from './update.js';

// Export undo functionality
export { undoUpdate } from './undo.js';

// Export select functionality
export { selectByPath } from './select.js';

// Export change detection
export { hasChanges, anyChange, typeChange } from './change-detection.js';