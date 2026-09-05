import { foldCompleteness, MWB_COMPLETENESS_CAP } from './completeness';

/**
 * `changes/my-work-board` MWB-T-1 — `foldCompleteness` is the pure fold behind the opt-in
 * `include_completeness` flag on `roles/filter` (MWB-R-8, MWB-R-4). Expected values below come
 * straight from `requirements.md`'s P25 scenario ("Editing card with missing sections") and the
 * P2-3552 `Number(value) === 1` rule already proven in
 * `results-validation-module.service.spec.ts` — not from re-deriving the implementation.
 */
describe('foldCompleteness (MWB-T-1)', () => {
  it('exports the cap the fold path is bounded by', () => {
    expect(MWB_COMPLETENESS_CAP).toBe(60);
  });

  it('P25 scenario: 2 of 5, missing in server order (requirements.md "Editing card with missing sections")', () => {
    const rows = [
      { section_name: 'general-information', validation: true },
      { section_name: 'geographic-location', validation: false },
      { section_name: 'evidences', validation: true },
      { section_name: 'contributor-partners', validation: false },
      { section_name: 'knowledge-product-info', validation: false },
    ];

    expect(foldCompleteness(rows)).toEqual({
      complete: 2,
      total: 5,
      missing: [
        'geographic-location',
        'contributor-partners',
        'knowledge-product-info',
      ],
    });
  });

  it('P22 6-section fixture: general-information, geographic-location, evidences, links-to-results, theory-of-change, partners', () => {
    const rows = [
      {
        section_name: 'general-information',
        validation: 1 as unknown as boolean,
      },
      {
        section_name: 'geographic-location',
        validation: 1 as unknown as boolean,
      },
      { section_name: 'evidences', validation: 0 as unknown as boolean },
      { section_name: 'links-to-results', validation: 1 as unknown as boolean },
      { section_name: 'theory-of-change', validation: 0 as unknown as boolean },
      { section_name: 'partners', validation: 1 as unknown as boolean },
    ];

    expect(foldCompleteness(rows)).toEqual({
      complete: 4,
      total: 6,
      missing: ['evidences', 'theory-of-change'],
    });
  });

  it("reads '1' (string), 1 (number) and true (boolean) all as valid — the Number(value) === 1 rule", () => {
    const rows = [
      { section_name: 'a', validation: '1' as unknown as boolean },
      { section_name: 'b', validation: 1 as unknown as boolean },
      { section_name: 'c', validation: true },
    ];

    expect(foldCompleteness(rows)).toEqual({
      complete: 3,
      total: 3,
      missing: [],
    });
  });

  it("reads '0' (string) as missing, NOT as a truthy string", () => {
    const rows = [
      {
        section_name: 'general-information',
        validation: '1' as unknown as boolean,
      },
      {
        section_name: 'geographic-location',
        validation: '0' as unknown as boolean,
      },
    ];

    expect(foldCompleteness(rows)).toEqual({
      complete: 1,
      total: 2,
      missing: ['geographic-location'],
    });
  });

  it("🛑 does not read the string 'true' as valid — Number('true') is NaN, never 1", () => {
    const rows = [
      {
        section_name: 'general-information',
        validation: 'true' as unknown as boolean,
      },
    ];

    expect(foldCompleteness(rows)).toEqual({
      complete: 0,
      total: 1,
      missing: ['general-information'],
    });
  });

  it('preserves the procedure order in `missing`, regardless of which rows are invalid', () => {
    const rows = [
      { section_name: 'first', validation: false },
      { section_name: 'second', validation: true },
      { section_name: 'third', validation: false },
    ];

    expect(foldCompleteness(rows).missing).toEqual(['first', 'third']);
  });

  it('empty input is not evidence of completeness — {0, 0, []}', () => {
    expect(foldCompleteness([])).toEqual({
      complete: 0,
      total: 0,
      missing: [],
    });
  });

  it('null/undefined input folds the same as empty input', () => {
    expect(foldCompleteness(null)).toEqual({
      complete: 0,
      total: 0,
      missing: [],
    });
    expect(foldCompleteness(undefined)).toEqual({
      complete: 0,
      total: 0,
      missing: [],
    });
  });
});
