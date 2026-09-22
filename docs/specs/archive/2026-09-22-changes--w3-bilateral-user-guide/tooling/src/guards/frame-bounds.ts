/**
 * frame-bounds.ts — post-capture dimension + skeleton assertion (BG-T-5).
 *
 * // @akili-spec changes/w3-bilateral-user-guide
 *
 * Implements `design.md` §5 (`bounds`, `BG-DD-6`) / `BG-R-8` / `BG-AC-8`: after every
 * capture, assert (1) the produced PNG's REAL pixel dimensions fall inside that route's
 * declared `bounds`, and (2) the existing skeleton gate found nothing visible in the frame
 * that was actually saved. Either failing is a hard failure — the run exits non-zero naming
 * the route, what was expected, and what was measured — never a console warning that lets
 * the run finish green.
 *
 * This is the guard the W1/W2 run needed and did not have. That run shipped a `1280×720`
 * frame full of skeleton rows and a `1280×186177` frame from a virtualised list past an
 * exit-0 run and two review gates, and both were caught only when a human measured the PNG
 * (`requirements.md` §8, defect class D2). D2 is one of the few classes in this spec that
 * CAN be automated, so `design.md` `BG-DD-6` puts a numeric bound in the pipeline instead of
 * leaving this to HITL eyeballing (the substitute reserved for defects that genuinely can't
 * be automated, D8–D10).
 *
 * Two assertions, in this order:
 *
 *   1. **Real dimensions, read from the file, never the requested viewport.** The requested
 *      viewport is EXACTLY the value that lied in the W1/W2 run: `fullPage: true` is a no-op
 *      on an inner-scroll container, so the request said `1280x1800` while the saved file was
 *      `1280x720`. A guard that trusts `route.viewport` (or any in-page `getBoundingClientRect`
 *      taken before the file is flushed) asserts nothing — it would have passed the exact
 *      frame this guard exists to catch. `readPngDimensions()` below opens the WRITTEN file
 *      and parses its PNG `IHDR` chunk (the first chunk after the 8-byte signature: 4-byte
 *      length, 4-byte type `"IHDR"`, then width/height as two big-endian `uint32`s at byte
 *      offsets 16–19 and 20–23) — no image-decoding dependency needed, since IHDR is the
 *      first 24 bytes of any valid PNG and this guard never needs pixel data, only the header.
 *   2. **Skeleton-free at the moment the file was written.** `capture.ts`'s existing
 *      `waitForNoVisibleSkeletons()` already gates BEFORE the screenshot and already hard-fails
 *      (throws) on timeout — this module does NOT reimplement skeleton detection (no
 *      `SKELETON_SELECTOR`, no DOM query here). `capture.ts` re-runs its own existing
 *      `countVisibleSkeletons()` primitive once more, right after the screenshot (closing the
 *      window between that pre-shot pass and the file actually landing on disk), and passes
 *      the resulting count in as `visibleSkeletonCount`. Wiring that number into THIS guard's
 *      failure path — rather than leaving it as a second, independent `if` that only logs —
 *      is what makes "visible skeleton" and "bad dimensions" a single BG-AC-8 checkpoint with
 *      one fail-loud convention, instead of one hard gate and one soft one.
 *
 * `bounds` is OPTIONAL per route (`design.md` §5: "new, optional"). A route with no `bounds`
 * declared is not dimension-asserted here — not silently treated as "in bounds", just not
 * checked yet. That is acceptable because `BG-T-7`/`BG-T-8`/`BG-T-9` author `bounds` per real
 * route from an OBSERVED clean capture of that route (see this task's falsifier evidence for
 * a worked example), not by guessing a plausible-looking range in advance; a route with no
 * `bounds` simply hasn't had that observation made yet. The skeleton assertion, in contrast,
 * is NOT optional — it always runs, because it has no "hasn't been observed yet" excuse.
 *
 * **Disqualifier this guard must never be used to defeat (`tasks.md` `BG-T-5`).** If a
 * legitimate capture's real dimensions vary run to run because the page's height is not
 * fixed, the fix is to re-specify that route's framing (a FIXED `viewport` + `fullPage:
 * false`, per `design.md` §3.2's attempt-2 rework), not to widen `bounds` until it admits
 * every observed value. A bound wide enough to admit both a clean render and a degenerate one
 * is not a bound.
 *
 * **The measured size is logged once per route, unconditionally (added post-review).** This
 * guard is the ONLY thing in the pipeline that reads a route's real, on-disk pixel size, and
 * `tasks.md`'s Definition of done for `BG-T-7`/`BG-T-8`/`BG-T-9` requires captures to be
 * "measured (dimensions recorded)" — a requirement nothing else in the pipeline can satisfy
 * without a human re-measuring the PNG by hand, which is exactly the manual step this guard
 * exists to replace. So `assertFrameBounds()` logs `[guard:frame-bounds] <routeId>: measured
 * <W>x<H> — bounds: …` BEFORE either assertion can throw, not only on the success path — a
 * route that fails still gets its real size on record, and a route with no `bounds` says so
 * in the same line (`bounds: none declared`) rather than staying silent, because an
 * unasserted route is the case a reader most needs to notice. Side benefit: an omitted or
 * over-wide `bounds` becomes visible in ordinary run output instead of staying invisible
 * until a bad frame ships.
 */

import { promises as fs } from 'fs';

/** Byte length of the PNG signature (8) + one chunk header (length 4 + type 4) + IHDR's own width/height (4 + 4). */
const IHDR_HEADER_BYTES = 24;

/** The fixed 8-byte sequence every valid PNG file starts with. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** ASCII chunk-type tag of a PNG's mandatory first chunk. */
const IHDR_CHUNK_TYPE = 'IHDR';

function fail(message: string): never {
  throw new Error(`[guard:frame-bounds] FAIL — ${message}`);
}

/** The measured, real pixel dimensions of a written PNG file. */
export interface MeasuredFrame {
  width: number;
  height: number;
}

/**
 * Per-route dimension sanity window (`design.md` §5's `bounds` field). Declared structurally
 * identical to `capture.ts`'s own (un-exported) `RouteBounds` — TypeScript's structural typing
 * makes that redundant-looking duplication resolve fine without an import, and avoids a
 * circular `capture.ts` <-> `guards/frame-bounds.ts` dependency (this module has no reason to
 * import `capture.ts`, and `capture.ts` already imports this module).
 */
export interface FrameBounds {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
}

/**
 * Reads a written PNG's REAL pixel dimensions straight from its `IHDR` chunk — never from a
 * requested viewport, an in-page `getBoundingClientRect()`, or any other value computed before
 * the file existed (see the file header: trusting the request is exactly how the W1/W2 run's
 * `1280x1800` request shipped a `1280x720` file). Reads only the first
 * `IHDR_HEADER_BYTES` (24) bytes of the file via a file handle — not the whole PNG — since a
 * dimension check needs only the header, and this run's largest degenerate frame under test is
 * ~186,000px tall; reading the full pixel data for that would be exactly the "heavy image
 * dependency" this task says to avoid.
 *
 * Fails loudly (does not return `{0,0}` or otherwise degrade silently) on a truncated file, a
 * missing PNG signature, or a first chunk that is not `IHDR` — any of those means "cannot
 * trust this measurement", which for a guard is the same as "must not silently pass".
 */
export async function readPngDimensions(pngPath: string): Promise<MeasuredFrame> {
  const buffer = Buffer.alloc(IHDR_HEADER_BYTES);
  const handle = await fs.open(pngPath, 'r');
  let bytesRead: number;
  try {
    ({ bytesRead } = await handle.read(buffer, 0, IHDR_HEADER_BYTES, 0));
  } finally {
    await handle.close();
  }

  if (bytesRead < IHDR_HEADER_BYTES) {
    fail(
      `"${pngPath}" is only ${bytesRead} byte(s) long — too short to contain a PNG signature ` +
        `plus an IHDR chunk (need at least ${IHDR_HEADER_BYTES}). Cannot trust this file's ` +
        'dimensions; treating an unreadable file as a violation, not a pass.',
    );
  }

  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(`"${pngPath}" does not start with the PNG signature — this is not a real PNG file.`);
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType !== IHDR_CHUNK_TYPE) {
    fail(`"${pngPath}"'s first chunk is "${chunkType}", not "IHDR" — cannot read its dimensions.`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * The single BG-AC-8 checkpoint for one capture: reads the real written dimensions, asserts
 * the skeleton-gate's re-checked result, then asserts `bounds` (when declared). Throws on the
 * FIRST violation found (skeleton before bounds — a skeleton-laden frame is worth reporting on
 * its own terms even when its size happens to also be in range, as the historical `1280x720`
 * frame was: in-bounds-looking, and still wrong). Returns the measurement on success so the
 * caller can log/record it (used by this task's falsifier evidence and by `BG-T-7`/`8`/`9` to
 * observe a clean capture's real size before authoring that route's `bounds`).
 */
export async function assertFrameBounds(
  routeId: string,
  pngPath: string,
  bounds: FrameBounds | undefined,
  visibleSkeletonCount: number,
): Promise<MeasuredFrame> {
  const measured = await readPngDimensions(pngPath);

  // Record the real size BEFORE either assertion below can throw — this is the only place in
  // the pipeline that reads a route's actual on-disk pixel size, and it is what satisfies
  // `BG-T-7`/`BG-T-8`/`BG-T-9`'s "measured (dimensions recorded)" Definition of done (see file
  // header). Logged unconditionally, pass or fail, and names when `bounds` was never declared
  // rather than leaving that silent.
  // eslint-disable-next-line no-console
  console.log(
    `[guard:frame-bounds] ${routeId}: measured ${measured.width}x${measured.height} — ` +
      (bounds === undefined
        ? 'bounds: none declared'
        : `bounds: w:[${bounds.minW}-${bounds.maxW}] h:[${bounds.minH}-${bounds.maxH}]`),
  );

  if (visibleSkeletonCount > 0) {
    fail(
      `route "${routeId}": ${visibleSkeletonCount} visible skeleton node(s) present in the ` +
        `captured frame (measured ${measured.width}x${measured.height}px). BG-AC-8 requires ` +
        'zero — a visible skeleton is a hard failure, not a warning.',
    );
  }

  if (bounds === undefined) {
    // Optional per route (see file header) — not asserted, not assumed to pass.
    return measured;
  }

  const { width, height } = measured;
  const inBounds =
    width >= bounds.minW && width <= bounds.maxW && height >= bounds.minH && height <= bounds.maxH;
  if (!inBounds) {
    fail(
      `route "${routeId}": measured ${width}x${height}px falls outside declared bounds ` +
        `width:[${bounds.minW}-${bounds.maxW}] height:[${bounds.minH}-${bounds.maxH}] ` +
        '(dimensions read from the written PNG file, never the requested viewport — BG-DD-6).',
    );
  }

  return measured;
}
