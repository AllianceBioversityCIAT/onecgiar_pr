// @akili-spec bilateral/review-list-source-and-reporter (BSR-T-3, BSR-R-4, BSR-AC-4, BSR-AC-5, BSR-AC-6)
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';
import { BilateralSourceDescriptor, resolveBilateralSource } from './resolve-bilateral-source';

describe('resolveBilateralSource', () => {
  const copy = BILATERAL_REVIEW_COPY.sourceChip;

  // The seven rows of the BSR-R-4 matrix, copied verbatim from requirements.md §6. Rows 6 and 7
  // are the two a naive `UNKNOWN -> placeholder` implementation gets wrong (BSR-AC-4, BSR-AC-6).
  const matrix: Array<{
    name: string;
    method: string | null | undefined;
    platformCode: string | null | undefined;
    expected: BilateralSourceDescriptor;
  }> = [
    { name: 'AI, any platform code -> ai', method: 'AI', platformCode: 'STAR', expected: { kind: 'ai' } },
    {
      name: 'MANUAL, any platform code -> Manual entry',
      method: 'MANUAL',
      platformCode: 'STAR',
      expected: { kind: 'pill', label: copy.manualEntry, accessibleName: copy.manualEntryAccessibleName }
    },
    {
      name: 'BULK, any platform code -> Bulk upload',
      method: 'BULK',
      platformCode: null,
      expected: { kind: 'pill', label: copy.bulkUpload, accessibleName: copy.bulkUploadAccessibleName }
    },
    {
      name: 'EXTERNAL, "STAR" -> Via API · STAR',
      method: 'EXTERNAL',
      platformCode: 'STAR',
      expected: { kind: 'pill', label: 'Via API · STAR', accessibleName: copy.viaApiWithCodeAccessibleName('STAR') }
    },
    {
      name: 'EXTERNAL, null -> Via API',
      method: 'EXTERNAL',
      platformCode: null,
      expected: { kind: 'pill', label: copy.viaApi, accessibleName: copy.viaApiAccessibleName }
    },
    // Trap row 1 (BSR-AC-4): an unmapped method with a real platform code is still observable
    // provenance — a naive implementation that sends every non-EXTERNAL/MANUAL/BULK/AI method
    // straight to the placeholder fails exactly this row.
    {
      name: "UNKNOWN, 'MEL' -> Via API · MEL (trap row)",
      method: 'UNKNOWN',
      platformCode: 'MEL',
      expected: { kind: 'pill', label: 'Via API · MEL', accessibleName: copy.viaApiWithCodeAccessibleName('MEL') }
    },
    // Trap row 2 (BSR-AC-6): with nothing real to show, UNKNOWN + no code IS the placeholder.
    {
      name: 'UNKNOWN, null -> placeholder (trap row)',
      method: 'UNKNOWN',
      platformCode: null,
      expected: { kind: 'placeholder' }
    }
  ];

  it.each(matrix)('$name', ({ method, platformCode, expected }) => {
    expect(resolveBilateralSource({ method, platformCode })).toEqual(expected);
  });

  it('has exactly seven rows (the full BSR-R-4 matrix, no row dropped)', () => {
    expect(matrix).toHaveLength(7);
  });

  it('treats a blank platform code ("", whitespace) the same as null on EXTERNAL', () => {
    expect(resolveBilateralSource({ method: 'EXTERNAL', platformCode: '' })).toEqual({
      kind: 'pill',
      label: copy.viaApi,
      accessibleName: copy.viaApiAccessibleName
    });
    expect(resolveBilateralSource({ method: 'EXTERNAL', platformCode: '   ' })).toEqual({
      kind: 'pill',
      label: copy.viaApi,
      accessibleName: copy.viaApiAccessibleName
    });
  });

  it('treats an undefined method the same as an unmapped one', () => {
    expect(resolveBilateralSource({ method: undefined, platformCode: null })).toEqual({ kind: 'placeholder' });
    expect(resolveBilateralSource({ method: undefined, platformCode: 'MEL' })).toEqual({
      kind: 'pill',
      label: 'Via API · MEL',
      accessibleName: copy.viaApiWithCodeAccessibleName('MEL')
    });
  });
});
