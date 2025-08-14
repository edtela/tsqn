import { ALL, META } from "./symbols.js";
import type { UpdateResult, ChangeDetector, ChangeDetectorFn } from "./types.js";

export function hasChanges<T extends object>(result: UpdateResult<T> | undefined, detector: ChangeDetector<T>) {
  if (result === undefined) return false;

  const { [ALL]: all, ...rest } = detector;
  if (all) {
    for (const key in result) {
      if (!(key in rest)) {
        (rest as any)[key] = all;
      }
    }
  }

  for (const key in rest) {
    const keyDetector = (rest as any)[key];
    if (typeof keyDetector === "function") {
      if (keyDetector(key, result)) {
        return true;
      }
    } else if (keyDetector !== undefined) {
      if (hasChanges((result as any)[key], keyDetector)) {
        return true;
      }
    }
  }

  return false;
}

export const anyChange: ChangeDetectorFn<any> = (key: string, r?: UpdateResult<any>) => {
  return r !== undefined && key in r;
};

export const typeChange: ChangeDetectorFn<any> = (key: string, r?: UpdateResult<any>) => {
  const meta = r?.[META];
  if (!meta || !(key in r) || !(key in meta)) return false;

  const newValue = r[key];
  const oldValue = meta[key]?.original;

  if (newValue === null) return oldValue !== null;
  if (oldValue === null) return newValue !== null;
  return typeof newValue !== typeof oldValue;
};