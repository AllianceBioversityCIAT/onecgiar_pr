import {
  buildContributorsExtras,
  type ContributorsRawRows,
} from './platform-report-contributors';

const rows = (
  overrides: Partial<ContributorsRawRows> = {},
): ContributorsRawRows => ({
  base: { result_id: 1, phase_year: 2026, primary_initiative_id: 50 },
  toc: {
    planned_result: 1,
    program_invested_financial_resources: null,
    toc_progressive_narrative: null,
  },
  initiatives: [
    { initiative_short_name: 'SP01 - Breeding', from_toc: 1 },
    { initiative_short_name: 'SP11 - Capacity', from_toc: 0 },
  ],
  centers: [
    { is_primary_center: 1, center_name: 'CIP - Potato', from_toc: 1 },
    { is_primary_center: 0, center_name: 'IRRI - Rice', from_toc: 0 },
  ],
  partners: [
    {
      partner_name: 'INRAB',
      partner_country_hq: 'Benin (BJ)',
      partner_type: 'Gov',
      from_toc: 1,
    },
    {
      partner_name: 'FAO',
      partner_country_hq: 'Italy (IT)',
      partner_type: 'IO',
      from_toc: 0,
    },
  ],
  ...overrides,
});

describe('buildContributorsExtras (P2-3095)', () => {
  it('returns nothing for phases before 2026, so earlier PDFs stay as they are', () => {
    for (const phase_year of [2022, 2023, 2024, 2025]) {
      expect(
        buildContributorsExtras(
          rows({
            base: { result_id: 1, phase_year, primary_initiative_id: 50 },
          }),
        ),
      ).toEqual({ contributors_split: null, toc_unplanned: null });
    }
  });

  it('returns nothing when the result was not found', () => {
    expect(buildContributorsExtras(rows({ base: null }))).toEqual({
      contributors_split: null,
      toc_unplanned: null,
    });
  });

  it('splits Science Programs, Centers and External Partners by from_toc when mapped to the ToC', () => {
    const { contributors_split, toc_unplanned } =
      buildContributorsExtras(rows());
    expect(toc_unplanned).toBeNull();
    expect(contributors_split).toEqual({
      toc_contributing_initiatives: [
        { initiative_short_name: 'SP01 - Breeding' },
      ],
      other_contributing_initiatives: [
        { initiative_short_name: 'SP11 - Capacity' },
      ],
      toc_contributing_centers: [
        { is_primary_center: true, center_name: 'CIP - Potato' },
      ],
      other_contributing_centers: [
        { is_primary_center: false, center_name: 'IRRI - Rice' },
      ],
      toc_external_partners: [
        {
          partner_name: 'INRAB',
          partner_country_hq: 'Benin (BJ)',
          partner_type: 'Gov',
        },
      ],
      other_external_partners: [
        {
          partner_name: 'FAO',
          partner_country_hq: 'Italy (IT)',
          partner_type: 'IO',
        },
      ],
    });
  });

  it('treats a null from_toc as "Other(s)"', () => {
    const { contributors_split } = buildContributorsExtras(
      rows({
        initiatives: [{ initiative_short_name: 'SP02', from_toc: null }],
      }),
    );
    expect(contributors_split?.other_contributing_initiatives).toEqual([
      { initiative_short_name: 'SP02' },
    ]);
    expect(contributors_split?.toc_contributing_initiatives).toEqual([]);
  });

  it('returns the two questions when the result is NOT mapped to the ToC', () => {
    const { contributors_split, toc_unplanned } = buildContributorsExtras(
      rows({
        toc: {
          planned_result: 0,
          program_invested_financial_resources: 1,
          toc_progressive_narrative: '  Contributed indirectly  ',
        },
      }),
    );
    expect(contributors_split).toBeNull();
    expect(toc_unplanned).toEqual({
      show_financial_resources: true,
      program_invested_financial_resources: 'Yes',
      show_why_reported: true,
      why_reported: 'Contributed indirectly',
    });
  });

  it('answers No, and leaves unanswered fields as null', () => {
    const { toc_unplanned } = buildContributorsExtras(
      rows({
        toc: {
          planned_result: false,
          program_invested_financial_resources: 0,
          toc_progressive_narrative: '   ',
        },
      }),
    );
    expect(toc_unplanned?.program_invested_financial_resources).toBe('No');
    expect(toc_unplanned?.why_reported).toBeNull();

    const unanswered = buildContributorsExtras(
      rows({
        toc: {
          planned_result: 0,
          program_invested_financial_resources: null,
          toc_progressive_narrative: null,
        },
      }),
    );
    expect(
      unanswered.toc_unplanned?.program_invested_financial_resources,
    ).toBeNull();
  });

  it('hides "Why is the result being reported?" for Program 41, same as the form', () => {
    const { toc_unplanned } = buildContributorsExtras(
      rows({
        base: { result_id: 1, phase_year: 2026, primary_initiative_id: 41 },
        toc: {
          planned_result: 0,
          program_invested_financial_resources: 1,
          toc_progressive_narrative: 'x',
        },
      }),
    );
    expect(toc_unplanned?.show_why_reported).toBe(false);
    expect(toc_unplanned?.why_reported).toBeNull();
  });

  it('returns nothing while the ToC question is unanswered', () => {
    expect(
      buildContributorsExtras(
        rows({
          toc: {
            planned_result: null,
            program_invested_financial_resources: null,
            toc_progressive_narrative: null,
          },
        }),
      ),
    ).toEqual({ contributors_split: null, toc_unplanned: null });
    expect(buildContributorsExtras(rows({ toc: null }))).toEqual({
      contributors_split: null,
      toc_unplanned: null,
    });
  });
});
