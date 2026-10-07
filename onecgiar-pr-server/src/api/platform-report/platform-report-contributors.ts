/**
 * P2-3095 — data the P25 result PDF needs from the 2026 Contributors and Partners section that the
 * SQL report function (`resultFullDataByResultCode`) does not return:
 *
 * - the ToC / "Other(s)" split of Science Programs, CGIAR Centers and External Partners
 *   (`from_toc` on each link row), shown only when the result is mapped to a ToC KPI;
 * - the two questions asked when the result is NOT mapped to the ToC:
 *   "Did the Program invest financial resources…" and "Why is the result being reported?".
 *
 * Phase gate (never `isP25()`): only phase 2026+ — the section was redesigned for that phase and
 * earlier phases keep their PDF exactly as it is today.
 */
export const CONTRIBUTORS_SPLIT_MIN_PHASE_YEAR = 2026;

/** Same rule as the result form (`hideWhyReportedField`): this Program never asks "why". */
export const WHY_REPORTED_HIDDEN_INITIATIVE_ID = 41;

export interface ContributorsBaseRow {
  result_id: number;
  phase_year: number | null;
  primary_initiative_id: number | null;
}

export interface ContributorsTocRow {
  planned_result: number | boolean | null;
  program_invested_financial_resources: number | boolean | null;
  toc_progressive_narrative: string | null;
}

export interface InitiativeRow {
  initiative_short_name: string;
  from_toc: number | boolean | null;
}

export interface CenterRow {
  is_primary_center: number | boolean | null;
  center_name: string;
  from_toc: number | boolean | null;
}

export interface PartnerRow {
  partner_name: string;
  partner_country_hq: string | null;
  partner_type: string | null;
  from_toc: number | boolean | null;
}

export interface ContributorsSplitData {
  toc_contributing_initiatives: { initiative_short_name: string }[];
  other_contributing_initiatives: { initiative_short_name: string }[];
  toc_contributing_centers: {
    is_primary_center: boolean;
    center_name: string;
  }[];
  other_contributing_centers: {
    is_primary_center: boolean;
    center_name: string;
  }[];
  toc_external_partners: Omit<PartnerRow, 'from_toc'>[];
  other_external_partners: Omit<PartnerRow, 'from_toc'>[];
}

export interface TocUnplannedData {
  show_financial_resources: boolean;
  program_invested_financial_resources: 'Yes' | 'No' | null;
  show_why_reported: boolean;
  why_reported: string | null;
}

export interface ContributorsExtras {
  contributors_split: ContributorsSplitData | null;
  toc_unplanned: TocUnplannedData | null;
}

export interface ContributorsRawRows {
  base: ContributorsBaseRow | null;
  toc: ContributorsTocRow | null;
  initiatives: InitiativeRow[];
  centers: CenterRow[];
  partners: PartnerRow[];
}

const isTrue = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const isFalse = (value: unknown): boolean =>
  value === false || value === 0 || value === '0';

const yesNo = (value: unknown): 'Yes' | 'No' | null => {
  if (isTrue(value)) return 'Yes';
  if (isFalse(value)) return 'No';
  return null;
};

const cleanText = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text.length > 0 ? text : null;
};

/** Pure: turns the raw rows into the extra keys merged into the PDF data. */
export function buildContributorsExtras(
  rows: ContributorsRawRows,
): ContributorsExtras {
  const empty: ContributorsExtras = {
    contributors_split: null,
    toc_unplanned: null,
  };
  const phaseYear = Number(rows.base?.phase_year);
  if (
    !rows.base ||
    !Number.isFinite(phaseYear) ||
    phaseYear < CONTRIBUTORS_SPLIT_MIN_PHASE_YEAR
  ) {
    return empty;
  }

  const planned = rows.toc?.planned_result;

  if (isTrue(planned)) {
    const initiatives = rows.initiatives ?? [];
    const centers = (rows.centers ?? []).map((c) => ({
      is_primary_center: isTrue(c.is_primary_center),
      center_name: c.center_name,
      from_toc: c.from_toc,
    }));
    const partners = rows.partners ?? [];
    const pick = <T extends { from_toc: unknown }>(
      list: T[],
      fromToc: boolean,
    ) =>
      list
        .filter((item) => isTrue(item.from_toc) === fromToc)
        .map(({ from_toc: _fromToc, ...rest }) => rest);

    return {
      contributors_split: {
        toc_contributing_initiatives: pick(initiatives, true),
        other_contributing_initiatives: pick(initiatives, false),
        toc_contributing_centers: pick(centers, true),
        other_contributing_centers: pick(centers, false),
        toc_external_partners: pick(partners, true),
        other_external_partners: pick(partners, false),
      },
      toc_unplanned: null,
    };
  }

  if (isFalse(planned)) {
    const showWhy =
      Number(rows.base.primary_initiative_id) !==
      WHY_REPORTED_HIDDEN_INITIATIVE_ID;
    return {
      contributors_split: null,
      toc_unplanned: {
        show_financial_resources: true,
        program_invested_financial_resources: yesNo(
          rows.toc?.program_invested_financial_resources,
        ),
        show_why_reported: showWhy,
        why_reported: showWhy
          ? cleanText(rows.toc?.toc_progressive_narrative)
          : null,
      },
    };
  }

  return empty;
}
