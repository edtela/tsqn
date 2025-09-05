// Define symbols for operations
export const ALL = Symbol("*"); // Apply update to all properties
export const WHERE = Symbol("?"); // Conditional filter for updates
export const DEFAULT = Symbol("{}"); // Default value for null fields
export const CONTEXT = Symbol("$"); // Context variables
export const META = Symbol("#"); // Track structural changes (delete/replace) in DataChange

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
