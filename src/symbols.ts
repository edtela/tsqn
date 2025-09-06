// Define symbols for operations
export const ALL = Symbol("*"); // Apply update to all properties
export const WHERE = Symbol("?"); // Conditional filter for updates
export const DEFAULT = Symbol("{}"); // Default value for null fields
export const CONTEXT = Symbol("$"); // Context variables
export const META = Symbol("#"); // Track structural changes (delete/replace) in DataChange

/**
 * Deep recursive selection/update operator
 * 
 * ## Semantics in select operations:
 * 
 * DEEP_ALL recursively traverses the data structure to find matching elements at any depth.
 * The value is a Select<any> statement that determines what to match and select.
 * 
 * ### Field projection (without WHERE):
 * ```typescript
 * [DEEP_ALL]: { a: true, b: true }
 * ```
 * Selects fields `a` and `b` wherever they appear in the tree, independently.
 * Each field is collected from any depth without requiring co-location.
 * 
 * ### Filtered projection (with WHERE):
 * ```typescript
 * [DEEP_ALL]: { 
 *   [WHERE]: predicate,  // Filter objects
 *   a: true, b: true     // Project fields from matches
 * }
 * ```
 * 1. First finds objects matching the WHERE predicate at any depth
 * 2. For each matching object, projects the specified fields
 * 3. Fields are selected from the matching object itself (not its children)
 * 
 * ### WHERE-only selection:
 * ```typescript
 * [DEEP_ALL]: { [WHERE]: predicate }
 * ```
 * Returns matching objects at any depth where the predicate is satisfied.
 * The entire matching object is returned (no field projection).
 * 
 * ### Common patterns:
 * ```typescript
 * // Find all objects with both fields a and b, then select those fields
 * [DEEP_ALL]: {
 *   [WHERE]: { a: { [NOT]: undefined }, b: { [NOT]: undefined } },
 *   a: true, b: true
 * }
 * 
 * // Find all strings containing "orange" 
 * [DEEP_ALL]: { [WHERE]: { [MATCH]: "(?i)orange" } }
 * 
 * // Find objects with price > 100 and select id and price fields
 * [DEEP_ALL]: {
 *   [WHERE]: { price: { [GT]: 100 } },
 *   id: true, price: true
 * }
 * 
 * // Find objects containing "orange" in any field and get their id
 * [DEEP_ALL]: {
 *   [WHERE]: { [MATCH]: "(?i)orange" },  // Matches if any field contains "orange"
 *   id: true  // Selects id field from the matching object (not from children)
 * }
 * ```
 * 
 * ### Traversal behavior:
 * - Recursively traverses objects and arrays
 * - Does not traverse into primitive values
 * - Handles circular references by tracking visited objects
 * - When an object matches, DEEP_ALL continues traversing its children
 * 
 * ## Semantics in update operations:
 * [To be documented when implementing update support]
 * 
 * ## Semantics in other operations:
 * [To be documented as operations are added]
 */
export const DEEP_ALL = Symbol("**"); // Deep recursive all - apply at any depth

// Predicate symbols
export const LT = Symbol("<"); // Less than
export const GT = Symbol(">"); // Greater than
export const LTE = Symbol("<="); // Less than or equal
export const GTE = Symbol(">="); // Greater than or equal
export const EQ = Symbol("=="); // Loose equality
export const NEQ = Symbol("!="); // Loose inequality
export const NOT = Symbol("!"); // Strict inequality / logical NOT
export const MATCH = Symbol("~"); // Regex match
export const SOME = Symbol("|"); // At least one match
