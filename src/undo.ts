import { META } from "./symbols.js";
import type { UpdateResult } from "./types.js";

export function undoUpdate<T extends object>(data: T, result: UpdateResult<T> | undefined) {
  return undoUpdateImpl(data, result);
}

function undoUpdateImpl(data: any, result: any) {
  if (data == null || typeof data !== "object" || result === undefined) {
    return data;
  }

  const { [META]: meta, ...rest } = result;
  for (const key in rest) {
    const change = rest[key];
    if (meta && key in meta) {
      data[key] = meta[key].original;
    } else {
      undoUpdateImpl(data[key], change);
    }
  }
}