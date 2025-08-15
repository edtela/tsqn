// Transform types - will be moved to types.ts later
type AccessTransform = string | number;

type SelectTransform = {
  [key: string]: Transform | boolean;
};

// Single transforms (everything except chains)
type SingleTransform = AccessTransform | SelectTransform;

// Chained transform can only contain single transforms
type ChainedTransform = SingleTransform[];

// Main transform type
type Transform = SingleTransform | ChainedTransform;

// Helper to check if a string is a valid array index
function isArrayIndex(key: string): boolean {
  const num = Number(key);
  return Number.isInteger(num) && num >= 0 && num < 2 ** 32 - 1 && String(num) === key;
}

// Helper to check if value is a SelectTransform
function isSelectTransform(value: any): value is SelectTransform {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Main transform function
export function transform(data: any, stmt: Transform): any {
  // Handle null/undefined data
  if (data == null) {
    return undefined;
  }

  // Handle ChainedTransform (array of transforms)
  if (Array.isArray(stmt)) {
    // Empty chain returns data unchanged
    if (stmt.length === 0) {
      return data;
    }

    // Apply transforms sequentially using recursion
    const [head, ...tail] = stmt;
    return transform(transform(data, head), tail);
  }

  // Handle SelectTransform (object with selections/transforms)
  if (isSelectTransform(stmt)) {
    // If data is an array, distribute the SelectTransform
    if (Array.isArray(data)) {
      return data.map(item => transform(item, stmt));
    }
    
    const result: any = {};
    
    for (const key in stmt) {
      const value = stmt[key];
      
      if (value === true) {
        // Select the value as-is from data[key]
        if (data[key] !== undefined) {
          result[key] = data[key];
        }
      } else if (value === false) {
        // Skip this key
        continue;
      } else if (isSelectTransform(value)) {
        // Nested SelectTransform - apply recursively
        // If data[key] exists, use it as the source for the nested transform
        // Otherwise, apply each nested transform to the original data
        if (data[key] !== undefined && data[key] !== null) {
          // Key exists - apply nested SelectTransform to data[key]
          const transformed = transform(data[key], value);
          if (transformed !== undefined && Object.keys(transformed).length > 0) {
            result[key] = transformed;
          }
        } else {
          // Key doesn't exist - build new nested object by applying transforms to original data
          const nestedResult: any = {};
          for (const nestedKey in value) {
            const nestedValue = value[nestedKey];
            if (nestedValue === true) {
              // Can't select from non-existent nested object
              continue;
            } else if (nestedValue === false) {
              continue;
            } else {
              // Apply nested transform to original data
              const transformed = transform(data, nestedValue);
              if (transformed !== undefined) {
                nestedResult[nestedKey] = transformed;
              }
            }
          }
          if (Object.keys(nestedResult).length > 0) {
            result[key] = nestedResult;
          }
        }
      } else {
        // Other transforms (AccessTransform, ChainedTransform) apply to entire data
        const transformed = transform(data, value);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      }
    }
    
    return result;
  }

  // Handle array data with AccessTransform
  if (Array.isArray(data)) {
    // Numeric index - direct access
    if (typeof stmt === "number") {
      return data[stmt];
    }
    // String key
    if (typeof stmt === "string") {
      // Check if it's a numeric string for array index access
      if (isArrayIndex(stmt)) {
        return data[stmt];
      }
      // Non-numeric string - distribute across all elements
      return data.map((item) => transform(item, stmt));
    }
  }

  // Handle basic property/index access for non-arrays
  if (typeof stmt === "string" || typeof stmt === "number") {
    return data[stmt];
  }

  return undefined;
}
