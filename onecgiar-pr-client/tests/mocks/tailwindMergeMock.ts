function classGroup(cls: string): string {
  const parts = cls.split('-');
  if (parts.length === 1) return cls;
  const last = parts[parts.length - 1];
  // If the last segment is purely numeric, the group is everything before it
  if (/^\d+$/.test(last)) {
    return parts.slice(0, -1).join('-');
  }
  return cls;
}

export function twMerge(...classes: string[]): string {
  const all = classes.join(' ').split(/\s+/).filter(Boolean);
  const seen = new Map<string, string>();
  for (const cls of all) {
    seen.set(classGroup(cls), cls);
  }
  return [...seen.values()].join(' ');
}
