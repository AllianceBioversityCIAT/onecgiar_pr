export class StringUtils {
  public static join(
    arr: string[],
    separator: string = ', ',
    lastSeparator?: string,
  ): string {
    if (arr.length <= 1) {
      return arr.join('');
    }

    if (lastSeparator != separator) {
      const lastItem = arr.slice(-1);
      const rest = arr.slice(0, -1);

      return `${rest.join(separator)}${lastSeparator}${lastItem}`;
    } else {
      return arr.join(separator);
    }
  }
}
