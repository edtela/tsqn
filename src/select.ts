import { ALL } from "./symbols.js";

export function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
  if (path.length === 0 || data === null || typeof data != "object" || Array.isArray(data)) {
    return data;
  }

  const [head, ...tail] = path;

  let result: any;
  if (typeof head === "string") {
    const value = selectByPath((data as any)[head], tail as any);
    if (value !== undefined) result = { [head]: value };
  } else if (head === ALL) {
    for (const key in data) {
      const value = selectByPath(data[key], tail as any);
      if (value !== undefined) {
        if (!result) {
          result = {};
        }
        result[key] = value;
      }
    }
  }

  return result;
}