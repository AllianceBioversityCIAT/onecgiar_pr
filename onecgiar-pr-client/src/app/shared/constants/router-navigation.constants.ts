/**
 * `NavigationExtras.info` a screen passes when it only mirrors its own state in the URL (filters, tabs, paging) and
 * must NOT be thrown back to the top of the page. The shell's `ExternalToolsComponent` resets the scroll on every
 * `NavigationStart`, which is right for a page change and wrong for a same-page query mirror (PRE-T-6).
 */
export const KEEP_SCROLL_NAVIGATION_INFO = { keepScroll: true } as const;

export function keepsScroll(info: unknown): boolean {
  return typeof info === 'object' && info !== null && (info as { keepScroll?: unknown }).keepScroll === true;
}
