import { ALL, DEEP_ALL, NOT, WHERE } from "./symbols.js";
import { Select, SelectResult } from "./types.js";
import { evalPredicate } from "./predicate.js";
import { toJSON } from "./serialization.js";

export function select<T>(data: T, stmt: Select<T>): SelectResult<T> | undefined {
  const result = selectImpl(data, stmt);
  return result === NO_RESULT ? undefined : result;
}

const NO_RESULT = Symbol();
type ImplResult = SelectResult<any> | typeof NO_RESULT;
export function selectImpl(data: any, stmt: Select<any>, result: ImplResult = NO_RESULT): ImplResult {
  const { [DEEP_ALL]: deepAll, [ALL]: all, [WHERE]: where, ...rest } = stmt as any;

  if (where) {
    // Check if it's a function or a predicate
    const whereResult = typeof where === "function" ? where(data) : evalPredicate(data, where);
    if (!whereResult) {
      return NO_RESULT;
    }
  }

  // Empty select statement {} is equivalent to true. In general in tsqn {} is true and [] is false
  if (deepAll === undefined && all === undefined && Object.keys(rest).length === 0) {
    return data;
  }

  if (data == null || typeof data !== "object") {
    // There is a select statement, but data is not an object.
    return NO_RESULT;
  }

  function addToResult(key: string, keyStmt: any) {
    /*console.log(
      `ADD TO RESULT: , ${key}, \n STMT: ${JSON.stringify(toJSON(keyStmt))}, \ndata: ${JSON.stringify(toJSON(data))}`,
      );*/
    if (Array.isArray(data)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        return NO_RESULT;
      }
    }

    let keyResult = result == NO_RESULT ? NO_RESULT : key in result ? result[key] : NO_RESULT;
    if (keyStmt === true) {
      // TODO maybe only if key in data
      keyResult = data[key];
    } else if (keyStmt != null && typeof keyStmt === "object") {
      keyResult = selectImpl(data[key], keyStmt, keyResult);
    }

    if (keyResult !== NO_RESULT) {
      if (result == NO_RESULT) {
        result = Array.isArray(data) ? [] : {};
      }
      result[key] = keyResult;
    }
    //console.log("RESULT", result);
    return keyResult;
  }

  if (deepAll) {
    const { [WHERE]: predicate, ...projection } = deepAll;

    for (const dataKey of Object.keys(data)) {
      if (predicate == null) {
        for (const projectKey of Object.keys(projection)) {
          if (dataKey === projectKey) {
            addToResult(dataKey, projection[projectKey]);
          } else if (data[dataKey] != null && typeof data[dataKey] === "object") {
            addToResult(dataKey, { [DEEP_ALL]: { [projectKey]: projection[projectKey] } });
          }
        }
      } else {
        let addResult = addToResult(dataKey, { [WHERE]: predicate });
        if (addResult === NO_RESULT) {
          //The predicate didn't apply. If the data is an object, go deeper
          if (data[dataKey] != null && typeof data[dataKey] === "object") {
            addResult = addToResult(dataKey, { [DEEP_ALL]: { [WHERE]: predicate } });
          }
        }

        if (addResult !== NO_RESULT) {
          widenResult(data[dataKey], result[dataKey], projection);
        }
      }
    }
  }

  if (all) {
    for (const key in data) {
      addToResult(key, all);
    }
  }

  if (Array.isArray(result) && result.length > 0) {
    result = result.filter((v, i) => i in result);
  }

  for (const key in rest) {
    addToResult(key, rest[key]);
  }

  return result;
}

function widenResult(data: any, result: any, projections: Record<string, any>) {
  if (data == null || typeof data !== "object" || result == null || typeof result !== "object") {
    return;
  }

  for (const resultKey of Object.keys(result)) {
    for (const projectKey of Object.keys(projections)) {
      // If field is in data, then select it
      if (projectKey in data) {
        // Only select it if wasn't already selected
        if (!(projectKey in result)) {
          const fieldResult = selectImpl(data, { [projectKey]: projections[projectKey] });
          if (fieldResult !== NO_RESULT) {
            result[projectKey] = fieldResult[projectKey];
          }
        }
      }
      // Go down the result path and widen recursively
      widenResult(data[resultKey], result[resultKey], { [projectKey]: projections[projectKey] });
    }
  }
}
