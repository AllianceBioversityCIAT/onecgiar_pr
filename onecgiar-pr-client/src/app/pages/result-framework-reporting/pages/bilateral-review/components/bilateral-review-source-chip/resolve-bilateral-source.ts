// @akili-spec bilateral/review-list-source-and-reporter (BSR-T-3, BSR-R-4, BSR-R-5, BSR-R-7, design.md §6.2)
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';

/**
 * Input to `resolveBilateralSource` — the two raw fields the derivation branches on. Deliberately
 * NOT `Pick<ResultToReview, ...>`: the review drawer detail payload (`BSR-T-5`, `BSR-R-9`) is a
 * different type with fields of the same name, and this function has no reason to depend on
 * either payload's shape — only on the two primitive values (design.md §6.2).
 */
export interface BilateralSourceInput {
  /** `creation_method` on the raw row — `'AI' | 'MANUAL' | 'BULK' | 'EXTERNAL' | 'UNKNOWN'` in
   *  practice, but treated as an open string: anything unmapped falls to the same branch as
   *  `'UNKNOWN'` (`BSR-R-4`'s last two matrix rows). */
  method: string | null | undefined;
  /** `external_platform_code` on the raw row. */
  platformCode: string | null | undefined;
}

/**
 * Discriminated so both call sites (the table cell, `BSR-T-4`; the drawer header, `BSR-T-5`)
 * branch on `kind` instead of parsing a bare string — the AI case is a component delegation, not
 * a label, so a bare string could never represent it without an out-of-band sentinel.
 */
export type BilateralSourceDescriptor =
  | { kind: 'ai' }
  | { kind: 'pill'; label: string; accessibleName: string }
  | { kind: 'placeholder' };

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Pure derivation of the Bilateral review Source value — the full `BSR-R-4` matrix:
 *
 * | `creation_method`        | `external_platform_code` | Result                     |
 * |---------------------------|---------------------------|-----------------------------|
 * | `AI`                      | any                       | `{ kind: 'ai' }`             |
 * | `MANUAL`                  | any                       | `Manual entry` pill          |
 * | `BULK`                    | any                       | `Bulk upload` pill           |
 * | `EXTERNAL`                | `"STAR"`                  | `Via API · STAR` pill        |
 * | `EXTERNAL`                | `null` / blank            | `Via API` pill               |
 * | `UNKNOWN` / unmapped       | non-blank                 | `Via API · <code>` pill      |
 * | `UNKNOWN` / unmapped       | `null` / blank            | `{ kind: 'placeholder' }`     |
 *
 * The two rows a naive `UNKNOWN → placeholder` implementation gets wrong: an unmapped method with
 * a real platform code is still observable provenance (`Via API · MEL`), while `EXTERNAL` itself
 * never falls to the placeholder — a blank code on an EXTERNAL row still means "via API", just
 * without a named platform. No automated gate distinguishes those two behaviors from a version
 * that unconditionally sends `UNKNOWN` to the placeholder EXCEPT the `('UNKNOWN', 'MEL')` row —
 * the falsifier this function's spec is built around.
 */
export function resolveBilateralSource(input: BilateralSourceInput): BilateralSourceDescriptor {
  const { method, platformCode } = input;
  const code = blankToNull(platformCode);
  const copy = BILATERAL_REVIEW_COPY.sourceChip;

  if (method === 'AI') {
    return { kind: 'ai' };
  }

  if (method === 'MANUAL') {
    return { kind: 'pill', label: copy.manualEntry, accessibleName: copy.manualEntryAccessibleName };
  }

  if (method === 'BULK') {
    return { kind: 'pill', label: copy.bulkUpload, accessibleName: copy.bulkUploadAccessibleName };
  }

  if (method === 'EXTERNAL') {
    return code
      ? { kind: 'pill', label: copy.viaApiWithCode(code), accessibleName: copy.viaApiWithCodeAccessibleName(code) }
      : { kind: 'pill', label: copy.viaApi, accessibleName: copy.viaApiAccessibleName };
  }

  // `UNKNOWN` or any other unmapped `creation_method`.
  return code
    ? { kind: 'pill', label: copy.viaApiWithCode(code), accessibleName: copy.viaApiWithCodeAccessibleName(code) }
    : { kind: 'placeholder' };
}
