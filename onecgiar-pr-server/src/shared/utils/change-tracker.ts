export class ChangeTracker {
  public static trackChangesForObjects<T>(
    oldList: T[],
    newList: T[],
    key: keyof T,
  ): { added: T[]; removed: T[] } {
    const added: T[] = newList.filter((nl) => nl[key] === undefined);
    newList = newList.filter((nl) => nl[key] !== undefined);

    const removed: T[] = [];

    const oldMap = new Map(oldList.map((item) => [item[key], item]));
    const newMap = new Map(newList.map((item) => [item[key], item]));

    // Find added items
    newMap.forEach((value, key) => {
      if (!oldMap.has(key)) {
        added.push(value);
      }
    });

    // Find removed items
    oldMap.forEach((value, key) => {
      if (!newMap.has(key)) {
        removed.push(value);
      }
    });

    return { added, removed };
  }

  public static trackChangesForArrays<T>(
    oldList: T[],
    newList: T[],
  ): { added: T[]; removed: T[] } {
    const added: T[] = [];
    const removed: T[] = [];

    const oldSet = new Set(oldList);
    const newSet = new Set(newList);

    // Find added items
    newSet.forEach((item) => {
      if (!oldSet.has(item)) {
        added.push(item);
      }
    });

    // Find removed items
    oldSet.forEach((item) => {
      if (!newSet.has(item)) {
        removed.push(item);
      }
    });

    return { added, removed };
  }
}
