// Define symbols for operations
export const ALL = Symbol("*"); // Apply update to all properties
export const WHERE = Symbol("?"); // Conditional filter for updates
export const DEFAULT = Symbol("{}"); // Default value for null fields
export const CONTEXT = Symbol("$"); // Context variables
export const META = Symbol("#"); // Track structural changes (delete/replace) in DataChange