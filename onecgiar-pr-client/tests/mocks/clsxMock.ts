export type ClassValue = string | number | boolean | null | undefined | Record<string, unknown> | ClassValue[];

function toClass(input: ClassValue): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return String(input);
  if (Array.isArray(input)) return input.map(toClass).filter(Boolean).join(' ');
  if (typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .join(' ');
  }
  return '';
}

export function clsx(...inputs: ClassValue[]): string {
  return inputs.map(toClass).filter(Boolean).join(' ');
}
