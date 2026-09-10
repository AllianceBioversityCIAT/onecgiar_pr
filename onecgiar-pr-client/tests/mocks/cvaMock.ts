export type VariantProps<T extends (...args: any) => any> = Record<string, string | undefined>;

export function cva(base: string, _config?: any): (opts?: any) => string {
  return (_opts?: any) => base;
}
