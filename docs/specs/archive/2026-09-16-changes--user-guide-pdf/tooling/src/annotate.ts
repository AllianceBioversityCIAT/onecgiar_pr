/**
 * annotate.ts — DOM overlay click-target marker (UG-T-6) + labelled multi-callout
 * annotations (UG-T-17, implements `design.md` `UG-DD-7` / `UG-R-21`).
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
 *
 * UG-T-17 addition (`UG-DD-7` / `UG-R-21`): `annotateCallouts` draws, for each
 * of 2-5 configured entries, the same document-relative ring geometry PLUS a
 * labelled chip + a straight connector with an arrowhead, so a screenshot can
 * carry several labelled feature callouts instead of just one silent ring.
 * `annotateClickTarget` (above/below) is left completely unmodified — it is
 * the single-ring primitive `UG-T-6` shipped and nothing here changes its
 * behavior or output, so no regression risk for routes that only need it.
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
 * Remove every overlay node previously injected by `annotateClickTarget` (or
 * `annotateCallouts`), leaving no residual trace in the DOM. Safe to call even if no overlay is
 * currently present.
 */
export async function removeAnnotation(page: Page): Promise<void> {
  await page.evaluate((overlayAttr) => {
    document.querySelectorAll(`[${overlayAttr}]`).forEach((node) => node.remove());
  }, OVERLAY_ATTR);
}

// ---------------------------------------------------------------------------------------------
// UG-T-17 — labelled multi-callout annotations (`UG-DD-7`, `UG-R-21`)
// ---------------------------------------------------------------------------------------------

/**
 * One entry in a route's `annotations[]` (`routes.config.json`, `UG-T-18`). `role: 'primary'`
 * gets the existing thicker (4px) ring — it marks the section's main click target, same visual
 * weight `UG-R-3` always required. `role: 'feature'` gets a slightly thinner (3px) ring — both
 * are the same orange token, only the ring's weight differs. `placement` is which side of the
 * target the label chip is drawn on; omit for the default (`'right'`), auto-flipped when that
 * side would fall outside the captured frame (see `annotateCallouts`).
 */
export interface CalloutSpec {
  selector: string;
  label: string;
  role: 'primary' | 'feature';
  placement?: 'left' | 'right' | 'above' | 'below';
}

/** Colors `annotateCallouts` draws with. Both come from `tokens.json` (`UG-DD-7`) — never a literal. */
export interface CalloutColors {
  /** Ring border/connector/chip-border color — the orange token. */
  ring: string;
  /** Chip background color — the secondary token. */
  chipBg: string;
}

export interface AnnotateCalloutsOptions {
  /**
   * Whether the route will be captured with `page.screenshot({ fullPage: true })`. Chip
   * auto-flip is checked against the full DOCUMENT bounds when `true`, or just the current
   * VIEWPORT when `false` — matching whichever frame `capture.ts` will actually save (`UG-R-21`:
   * "auto-flip … when the chip would fall outside the captured frame"). Defaults to `true`,
   * mirroring `capture.ts`'s own `DEFAULT_FULL_PAGE`.
   */
  fullPage?: boolean;
  /** Ring padding (px), applied to every entry. Defaults to the same value `annotateClickTarget` uses. */
  padding?: number;
}

/** `feature`-role rings are 1px thinner than `primary` — both still orange, per `UG-DD-7`. */
const FEATURE_BORDER_WIDTH = 3;
/** The only accepted neutral literal in this module — chip text color (`UG-DD-7` "Consequences"). */
const CHIP_TEXT_COLOR = '#fff';
/** Outward gap (px) between a ring's outer edge and its chip, leaving room for a visible connector. */
const CONNECTOR_GAP = 28;

/**
 * Draws, for every `{ locator, spec }` entry, the ring (`primary`: 4px / `feature`: 3px, both
 * `colors.ring`) plus — only when `spec.label` is non-empty — a label chip and a straight
 * connector with an arrowhead pointing at the ring. Entries with an empty `label` (the
 * `capture.ts` fallback shape for routes with no configured `annotations[]`) get a ring only,
 * so unconfigured routes render exactly as `annotateClickTarget` always has.
 *
 * All positioning happens inside a single `page.evaluate()` call so the chip-vs-target and
 * chip-vs-chip collision checks below run against real, just-measured DOM rects (`getBoundingClientRect`)
 * without any risk of the page having reflowed between round-trips. Chip sizing is measured by
 * appending the (fully styled, `white-space: nowrap`) chip off-screen first — this never paints
 * a visible flash because Chromium doesn't yield/paint mid-script, only forces a synchronous
 * layout for `getBoundingClientRect()`.
 *
 * Placement algorithm per entry (`UG-R-21`): try the requested `placement` (default `'right'`),
 * then its opposite side, then the two remaining sides, in that order — the first candidate
 * that both (a) stays inside the captured frame and (b) doesn't intersect another entry's ring
 * or an already-placed chip wins. If none of the 4 sides is collision-free, each side is
 * retried while nudging the chip along its "free" axis (vertical for left/right placements,
 * horizontal for above/below) in ±16px steps up to ±80px. If that still finds nothing, the
 * first in-frame candidate is used as a last resort (never throws — a crowded screenshot is a
 * visual-review concern, per `UG-T-18`'s DoD, not a hard failure here).
 *
 * The connector endpoints are the nearest boundary point of each rect to the OTHER rect's
 * center (a simple point-to-rect clamp) — this stays correct whether the chip ended up exactly
 * beside the ring or nudged off-axis to dodge a collision, without needing separate per-placement
 * geometry.
 */
export async function annotateCallouts(
  page: Page,
  callouts: Array<{ locator: Locator; spec: CalloutSpec }>,
  colors: CalloutColors,
  options: AnnotateCalloutsOptions = {},
): Promise<void> {
  const fullPage = options.fullPage ?? true;
  const padding = options.padding ?? DEFAULT_PADDING;

  const resolved = await Promise.all(
    callouts.map(async ({ locator, spec }) => {
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(
          `annotateCallouts: target for callout "${spec.label || spec.selector}" (selector ` +
            `"${spec.selector}") has no bounding box — it is not visible/attached, or resolves ` +
            'to zero elements.',
        );
      }
      return {
        box,
        label: spec.label,
        placement: spec.placement,
        borderWidth: spec.role === 'primary' ? DEFAULT_BORDER_WIDTH : FEATURE_BORDER_WIDTH,
      };
    }),
  );

  await page.evaluate(
    (args) => {
      const { entries, ringColor, chipBg, chipTextColor, padding, overlayAttr, zIndex, fullPage, gap } = args;

      // Idempotent: clear any stale overlay first so repeated calls never stack up.
      document.querySelectorAll(`[${overlayAttr}]`).forEach((node) => node.remove());

      const svgNS = 'http://www.w3.org/2000/svg';
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // The frame the screenshot will actually save: the whole document for `fullPage: true`
      // routes, or just the current viewport rectangle (in document coordinates) otherwise.
      const frame = fullPage
        ? { left: 0, top: 0, right: document.documentElement.scrollWidth, bottom: document.documentElement.scrollHeight }
        : { left: scrollX, top: scrollY, right: scrollX + window.innerWidth, bottom: scrollY + window.innerHeight };

      type Rect = { left: number; top: number; right: number; bottom: number };

      function clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
      }
      function rectsIntersect(a: Rect, b: Rect): boolean {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }
      function nearestBoundaryPoint(rect: Rect, toward: { x: number; y: number }): { x: number; y: number } {
        return { x: clamp(toward.x, rect.left, rect.right), y: clamp(toward.y, rect.top, rect.bottom) };
      }
      function rectWithinFrame(rect: Rect): boolean {
        return rect.left >= frame.left && rect.top >= frame.top && rect.right <= frame.right && rect.bottom <= frame.bottom;
      }

      const ringRects: Rect[] = [];

      // Pass 1: draw every ring first, so chip placement (pass 2) can check against ALL of
      // them, not just entries processed earlier.
      entries.forEach((entry) => {
        const { box, borderWidth } = entry;
        const ringRect: Rect = {
          left: box.x + scrollX - padding,
          top: box.y + scrollY - padding,
          right: box.x + scrollX + box.width + padding,
          bottom: box.y + scrollY + box.height + padding,
        };
        ringRects.push(ringRect);

        const ring = document.createElement('div');
        ring.setAttribute(overlayAttr, 'true');
        ring.setAttribute('aria-hidden', 'true');
        ring.setAttribute('data-ug-purpose', 'callout-ring');
        ring.style.position = 'absolute';
        ring.style.left = `${ringRect.left}px`;
        ring.style.top = `${ringRect.top}px`;
        ring.style.width = `${ringRect.right - ringRect.left}px`;
        ring.style.height = `${ringRect.bottom - ringRect.top}px`;
        ring.style.boxSizing = 'border-box';
        ring.style.margin = '0';
        ring.style.padding = '0';
        ring.style.background = 'transparent';
        ring.style.border = `${borderWidth}px solid ${ringColor}`;
        ring.style.borderRadius = '10px';
        ring.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 18px 3px ${ringColor}`;
        ring.style.zIndex = zIndex;
        ring.style.pointerEvents = 'none';
        document.body.appendChild(ring);
      });

      const placedChipRects: Rect[] = [];
      const PLACEMENT_ORDER = ['right', 'left', 'above', 'below'] as const;
      const OPPOSITE: Record<string, string> = { right: 'left', left: 'right', above: 'below', below: 'above' };

      // Pass 2: chips + connectors, in entry order — earlier entries get first pick of their
      // preferred side; later ones dodge whatever earlier ones already claimed.
      entries.forEach((entry, i) => {
        const { label, placement: requestedPlacement } = entry;
        if (!label) {
          return; // No-label entries (capture.ts's no-`annotations[]` fallback): ring only.
        }

        const ringRect = ringRects[i];

        // Measure the chip's natural size by building it fully styled but off-flow first —
        // `white-space: nowrap` keeps it single-line so its measured width is its real width.
        const chip = document.createElement('div');
        chip.setAttribute(overlayAttr, 'true');
        chip.setAttribute('aria-hidden', 'true');
        chip.setAttribute('data-ug-purpose', 'callout-chip');
        chip.textContent = label;
        chip.style.position = 'absolute';
        chip.style.left = '-9999px';
        chip.style.top = '-9999px';
        chip.style.whiteSpace = 'nowrap';
        chip.style.background = chipBg;
        chip.style.color = chipTextColor;
        chip.style.border = `2px solid ${ringColor}`;
        chip.style.borderRadius = '6px';
        chip.style.padding = '6px 10px';
        chip.style.fontSize = '16px';
        chip.style.fontWeight = '600';
        chip.style.lineHeight = '1.2';
        // Font family is intentionally NOT set — it inherits the page's own Manrope stack from
        // `document.body`, per `UG-DD-7` ("Manrope from the page's own font").
        chip.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.35)';
        chip.style.zIndex = zIndex;
        chip.style.pointerEvents = 'none';
        document.body.appendChild(chip);

        const measured = chip.getBoundingClientRect();
        const chipWidth = measured.width;
        const chipHeight = measured.height;

        // Avoid every OTHER entry's ring, and every chip already placed this pass.
        const avoidRects: Rect[] = ringRects.filter((_, j) => j !== i).concat(placedChipRects);

        const placement = requestedPlacement || 'right';
        const opposite = OPPOSITE[placement];
        const candidateSides: string[] = [
          placement,
          opposite,
          ...PLACEMENT_ORDER.filter((side) => side !== placement && side !== opposite),
        ];

        function computeChipRect(side: string): Rect {
          const cx = (ringRect.left + ringRect.right) / 2;
          const cy = (ringRect.top + ringRect.bottom) / 2;
          switch (side) {
            case 'left':
              return { left: ringRect.left - gap - chipWidth, top: cy - chipHeight / 2, right: ringRect.left - gap, bottom: cy + chipHeight / 2 };
            case 'above':
              return { left: cx - chipWidth / 2, top: ringRect.top - gap - chipHeight, right: cx + chipWidth / 2, bottom: ringRect.top - gap };
            case 'below':
              return { left: cx - chipWidth / 2, top: ringRect.bottom + gap, right: cx + chipWidth / 2, bottom: ringRect.bottom + gap + chipHeight };
            case 'right':
            default:
              return { left: ringRect.right + gap, top: cy - chipHeight / 2, right: ringRect.right + gap + chipWidth, bottom: cy + chipHeight / 2 };
          }
        }

        function offsetAlongFreeAxis(rect: Rect, side: string): Rect | null {
          const freeAxisIsVertical = side === 'left' || side === 'right';
          const steps = [16, -16, 32, -32, 48, -48, 64, -64, 80, -80];
          for (const step of steps) {
            const moved: Rect = freeAxisIsVertical
              ? { left: rect.left, right: rect.right, top: rect.top + step, bottom: rect.bottom + step }
              : { left: rect.left + step, right: rect.right + step, top: rect.top, bottom: rect.bottom };
            if (rectWithinFrame(moved) && !avoidRects.some((r) => rectsIntersect(moved, r))) {
              return moved;
            }
          }
          return null;
        }

        let chosen: Rect | null = null;

        for (const side of candidateSides) {
          const candidate = computeChipRect(side);
          if (rectWithinFrame(candidate) && !avoidRects.some((r) => rectsIntersect(candidate, r))) {
            chosen = candidate;
            break;
          }
        }

        if (!chosen) {
          for (const side of candidateSides) {
            const nudged = offsetAlongFreeAxis(computeChipRect(side), side);
            if (nudged) {
              chosen = nudged;
              break;
            }
          }
        }

        if (!chosen) {
          // Best-effort fallback: first candidate that at least stays inside the frame, else
          // the raw requested placement. Never throws — see the function doc comment.
          chosen = candidateSides.map(computeChipRect).find(rectWithinFrame) ?? computeChipRect(placement);
        }

        placedChipRects.push(chosen);

        chip.style.left = `${chosen.left}px`;
        chip.style.top = `${chosen.top}px`;

        // Connector: nearest-point-on-rect-boundary for both ends (clamping the other rect's
        // center into this rect's bounds) — a straight line regardless of whether the chip sits
        // cleanly beside the ring or was nudged off-axis to dodge a collision.
        const chipCenter = { x: (chosen.left + chosen.right) / 2, y: (chosen.top + chosen.bottom) / 2 };
        const ringCenter = { x: (ringRect.left + ringRect.right) / 2, y: (ringRect.top + ringRect.bottom) / 2 };
        const ringPoint = nearestBoundaryPoint(ringRect, chipCenter);
        const chipPoint = nearestBoundaryPoint(chosen, ringCenter);

        const dx = ringPoint.x - chipPoint.x;
        const dy = ringPoint.y - chipPoint.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const arrowLength = 9;
        const arrowWidth = 7;
        const tip = ringPoint;
        const backX = tip.x - ux * arrowLength;
        const backY = tip.y - uy * arrowLength;
        const perpX = -uy;
        const perpY = ux;
        const p1 = { x: backX + (perpX * arrowWidth) / 2, y: backY + (perpY * arrowWidth) / 2 };
        const p2 = { x: backX - (perpX * arrowWidth) / 2, y: backY - (perpY * arrowWidth) / 2 };

        const minX = Math.min(chipPoint.x, tip.x, p1.x, p2.x);
        const minY = Math.min(chipPoint.y, tip.y, p1.y, p2.y);
        const maxX = Math.max(chipPoint.x, tip.x, p1.x, p2.x);
        const maxY = Math.max(chipPoint.y, tip.y, p1.y, p2.y);

        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute(overlayAttr, 'true');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('data-ug-purpose', 'callout-connector');
        svg.style.position = 'absolute';
        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${maxX - minX}px`;
        svg.style.height = `${maxY - minY}px`;
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = zIndex;

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', String(chipPoint.x - minX));
        line.setAttribute('y1', String(chipPoint.y - minY));
        line.setAttribute('x2', String(backX - minX));
        line.setAttribute('y2', String(backY - minY));
        line.setAttribute('stroke', ringColor);
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');

        const arrow = document.createElementNS(svgNS, 'polygon');
        arrow.setAttribute(
          'points',
          `${tip.x - minX},${tip.y - minY} ${p1.x - minX},${p1.y - minY} ${p2.x - minX},${p2.y - minY}`,
        );
        arrow.setAttribute('fill', ringColor);

        svg.appendChild(line);
        svg.appendChild(arrow);
        document.body.appendChild(svg);
      });
    },
    {
      entries: resolved,
      ringColor: colors.ring,
      chipBg: colors.chipBg,
      chipTextColor: CHIP_TEXT_COLOR,
      padding,
      overlayAttr: OVERLAY_ATTR,
      zIndex: OVERLAY_Z_INDEX,
      fullPage,
      gap: CONNECTOR_GAP,
    },
  );
}
