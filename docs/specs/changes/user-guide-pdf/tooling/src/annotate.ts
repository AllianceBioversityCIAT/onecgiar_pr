/**
 * annotate.ts — DOM overlay click-target marker (UG-T-6).
 *
 * Implements `design.md` `UG-DD-3`: mark a click target with a highlight ring
 * injected directly into the DOM *before* `page.screenshot()`, instead of
 * post-processing the saved PNG. This buys pixel-accurate placement against
 * the real, responsive-rendered layout via Playwright's own
 * `locator.boundingBox()` — no second (image-pixel) coordinate system needed.
 *
 * Stacking-context trap (see `UG-DD-3` "Consequences" / design.md §12):
 * appending the overlay to `document.body` — as a DIRECT child, never nested
 * inside any app-internal wrapper — is load-bearing. If an ancestor further
 * down the tree establishes its own stacking context (e.g. a `transform`,
 * `opacity < 1`, `filter`, or `position: relative; z-index: <n>` wrapper —
 * common in Angular component styling and CDK overlays), any z-index applied
 * to a descendant of that ancestor is capped inside it and can never paint
 * above unrelated siblings, no matter how large the z-index number is. A
 * `<div>` appended directly to `document.body` sits in the ROOT stacking
 * context alongside the Angular app root, so a very high `z-index` there is
 * compared against the whole page rather than trapped inside some inner
 * wrapper.
 *
 * Below-the-fold trap (found integrating with `capture.ts` / UG-T-7, reported
 * per the Reviewer note carried in that task's brief): `boundingBox()` returns
 * coordinates relative to the CURRENT VIEWPORT, not the document. The overlay
 * was originally `position: fixed` at those raw coordinates, which is correct
 * only while the viewport used for positioning matches the viewport used for
 * capture. `page.screenshot({ fullPage: true })` captures the FULL DOCUMENT
 * (via CDP `captureBeyondViewport`), so a `position: fixed` node ends up
 * anchored near the top of that expanded capture surface instead of over the
 * target once the target sits below the fold. Fix: read `window.scrollX/Y` at
 * annotation time and add it to the (viewport-relative) bounding box to get
 * document-relative coordinates, then use `position: absolute` (still a
 * direct child of `document.body`, still in the root stacking context) so the
 * ring is pinned to the document, not the viewport — correct for both normal
 * and full-page captures, above or below the fold.
 */

import type { Locator, Page } from '@playwright/test';

/**
 * Attribute used to tag every node this module injects, so removal is exhaustive and idempotent.
 * Exported so `capture.ts` (UG-T-7) can query for residual `[${OVERLAY_ATTR}]` nodes after
 * `removeAnnotation()` without duplicating this string.
 */
export const OVERLAY_ATTR = 'data-ug-annotation';

/** Effectively unbounded: the highest value CSS accepts as an integer z-index. */
const OVERLAY_Z_INDEX = '2147483647';

export interface AnnotateOptions {
  /**
   * Outward gap (px) between the target's own bounding box and the highlight
   * ring. The ring's border is drawn entirely within this padding band, OUTSIDE
   * the target's box, which is what keeps it from ever covering the target's
   * own visible label text — independent of where that label sits inside the
   * target.
   */
  padding?: number;
  /** Ring border thickness (px). Must be <= padding or the border would encroach on the target's box. */
  borderWidth?: number;
}

const DEFAULT_PADDING = 10;
const DEFAULT_BORDER_WIDTH = 4;

/**
 * Inject an absolute-positioned (document coordinates) highlight ring around `locator`'s current bounding
 * box, appended directly to `document.body`.
 *
 * The ring is a hollow rectangle (transparent fill, colored border + glow)
 * offset outward from the target by `padding`, so it frames the element
 * without ever painting over the element's own content/label. Call
 * `removeAnnotation(page)` before navigating away or capturing the next route.
 *
 * @param page     The Playwright page the overlay is injected into.
 * @param locator  Locator for the element to mark. Must resolve to exactly
 *                 one visible, attached element (a zero/undefined bounding
 *                 box throws rather than silently drawing nothing).
 * @param color    Marker color (e.g. a CSS color/hex string). The real
 *                 pipeline passes the orange design token
 *                 (`--pr-color-orange-500`, extracted by `tokens.ts` /
 *                 `UG-T-5`) once wired together in `capture.ts` (`UG-T-7`).
 *                 This module never hardcodes a color itself.
 */
export async function annotateClickTarget(
  page: Page,
  locator: Locator,
  color: string,
  options: AnnotateOptions = {},
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(
      'annotateClickTarget: target locator has no bounding box — it is not visible/attached, or resolves to zero elements.',
    );
  }

  const padding = options.padding ?? DEFAULT_PADDING;
  const borderWidth = options.borderWidth ?? DEFAULT_BORDER_WIDTH;

  // boundingBox() is viewport-relative; convert to document-relative coordinates
  // so the overlay survives a `fullPage` screenshot regardless of scroll position
  // or whether the target is below the fold (see the "Below-the-fold trap" note
  // at the top of this file).
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));

  await page.evaluate(
    (args) => {
      const { box, color, padding, borderWidth, overlayAttr, zIndex, scroll } = args;

      // Idempotent: clear any stale overlay first so repeated calls never stack up.
      document.querySelectorAll(`[${overlayAttr}]`).forEach((node) => node.remove());

      const ring = document.createElement('div');
      ring.setAttribute(overlayAttr, 'true');
      ring.setAttribute('aria-hidden', 'true');
      ring.setAttribute('data-ug-purpose', 'click-target-marker');

      // Positioned/sized from the target's boundingBox() (converted to
      // document-relative via `scroll`), expanded outward by `padding` on
      // every side. Because the div's own box (border-box sizing) starts
      // `padding` px outside the target's box, the border line itself — the
      // only visibly painted part of this div — never overlaps the target's
      // own rendered content, so its label always stays legible.
      // `position: absolute` (not `fixed`) anchors it to the DOCUMENT rather
      // than the viewport, so it stays correctly placed under a `fullPage`
      // screenshot's expanded capture surface, above or below the fold.
      ring.style.position = 'absolute';
      ring.style.left = `${box.x + scroll.x - padding}px`;
      ring.style.top = `${box.y + scroll.y - padding}px`;
      ring.style.width = `${box.width + padding * 2}px`;
      ring.style.height = `${box.height + padding * 2}px`;
      ring.style.boxSizing = 'border-box';
      ring.style.margin = '0';
      ring.style.padding = '0';

      ring.style.background = 'transparent';
      ring.style.border = `${borderWidth}px solid ${color}`;
      ring.style.borderRadius = '10px';
      // A soft white halo first (helps the ring read against busy/dark
      // backgrounds), then a colored glow, both outside the border line.
      ring.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 18px 3px ${color}`;

      ring.style.zIndex = zIndex;
      ring.style.pointerEvents = 'none';

      // Direct child of <body> — see the stacking-context note at the top of
      // this file / UG-DD-3. Never append into any app-internal container.
      document.body.appendChild(ring);
    },
    { box, color, padding, borderWidth, overlayAttr: OVERLAY_ATTR, zIndex: OVERLAY_Z_INDEX, scroll },
  );
}

/**
 * Remove every overlay node previously injected by `annotateClickTarget`,
 * leaving no residual trace in the DOM. Safe to call even if no overlay is
 * currently present.
 */
export async function removeAnnotation(page: Page): Promise<void> {
  await page.evaluate((overlayAttr) => {
    document.querySelectorAll(`[${overlayAttr}]`).forEach((node) => node.remove());
  }, OVERLAY_ATTR);
}
