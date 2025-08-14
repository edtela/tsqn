# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSQN (TypeScript Query Notation) is a type-safe data update library that provides declarative updates with automatic change tracking. It uses special symbols (ALL, WHERE, DEFAULT, CONTEXT, META) to enable powerful update patterns while maintaining full TypeScript type safety.

## Development Commands

```bash
# Build the library (creates dist/ with CJS and ESM formats)
npm run build

# Run tests
npm test                    # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:coverage      # Run tests with coverage report

# Type checking
npm run typecheck          # Verify TypeScript types

# Development mode (watch and rebuild)
npm run dev

# Full validation before publish
npm run prepublishOnly     # Runs typecheck, test:run, and build
```

### Running Individual Tests

```bash
# Run a specific test file
npx vitest run tests/update.test.ts

# Run tests matching a pattern
npx vitest run -t "WHERE operator"

# Run tests in watch mode for a specific file
npx vitest tests/select.test.ts
```

## Architecture

The library is organized around a core update engine with specialized modules:

### Core Modules

- **src/update.ts**: Main update engine implementing the recursive update algorithm with support for all operators (ALL, WHERE, DEFAULT, CONTEXT). Handles both partial updates and full replacements.

- **src/types.ts**: Complex TypeScript type definitions that enable full type safety. Uses advanced TypeScript features like conditional types and mapped types to ensure type-safe updates at compile time.

- **src/symbols.ts**: Exported symbols that act as special keys in update statements. These symbols enable the library's advanced features while avoiding naming conflicts.

- **src/undo.ts**: Implements the undo functionality by traversing the change metadata (META) to restore original values.

- **src/select.ts**: Path-based data selection supporting the ALL operator for bulk selections.

- **src/change-detection.ts**: Utilities for detecting specific types of changes in update results.

### Key Design Patterns

1. **Recursive Update Algorithm**: The update function recursively traverses objects, applying transformations at each level while maintaining change tracking.

2. **Symbol-Based Operators**: Special symbols (ALL, WHERE, etc.) act as reserved keys that trigger specific behaviors during updates.

3. **Change Tracking via META**: Every update returns a result object with a META symbol containing original values, enabling undo operations.

4. **Type-Safe Updates**: The Update<T> type ensures that only valid updates for a given data structure are allowed at compile time.

5. **Dual Format Support**: Library exports both CommonJS and ESM formats via tsup bundling.

## Testing Approach

Tests are written using Vitest and located in the `tests/` directory. Each core module has corresponding tests that verify both functionality and type safety. Tests use the `describe`/`it` pattern and cover edge cases including null handling, nested updates, and operator combinations.