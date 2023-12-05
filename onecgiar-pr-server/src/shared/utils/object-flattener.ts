export class ObjectFlattener {
  static flattenObjects(objects: any[] | Record<string, any>): any {
    if (Array.isArray(objects)) {
      return objects.map((obj) => this.flattenObject(obj, ''));
    } else {
      return this.flattenObject(objects, '');
    }
  }

  private static flattenObject(
    obj: Record<string, any>,
    prefix = '',
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const flatObject = this.flattenObject(obj[key], key);
        for (const flatKey in flatObject) {
          result[flatKey] = flatObject[flatKey];
        }
      } else {
        const prefixedKey = prefix ? `${prefix}.${key}` : key;
        result[prefixedKey] = obj[key];
      }
    }
    return result;
  }
}
