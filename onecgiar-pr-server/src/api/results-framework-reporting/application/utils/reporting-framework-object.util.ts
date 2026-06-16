type ObjectWithHasOwn = typeof Object & {
  hasOwn(object: object, property: PropertyKey): boolean;
};

export function objectHasOwn(object: object, property: PropertyKey): boolean {
  return (Object as ObjectWithHasOwn).hasOwn(object, property);
}
