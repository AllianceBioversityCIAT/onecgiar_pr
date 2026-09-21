// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4b)
import { QualityPayloadImpactArea } from '../bilateral-quality-rules';

/**
 * Top-level `impact_areas` — new in contract v0.2 (design.md §5 "Impact-areas mapper";
 * `BIL-QAI-R-2` scenario "Impact areas travel as an optional block"; integration-contracts.md
 * → "Impact areas (`impact_areas`) — new in v0.2").
 *
 * Source: `detail.dac_scores.<pillar>` — built by
 * `BilateralService.buildDacScoresSummary` (`bilateral.service.ts:2031-2090`) from the five
 * `DAC_PILLAR_CONFIG` pillars (`bilateral.service.ts:164-190`). Each pillar entry is
 * `{ tag_title, impact_area_names }`: `tag_title` is `GenderTagLevel.description` (the visible
 * `(0)/(1)/(2)` tag label) and `impact_area_names` is already filtered to the seeded
 * `impact_areas_scores_components` rows for that pillar, populated only when the pillar's tag
 * level is Principal (`bilateral.service.ts:2065-2081`).
 *
 * `ResultsService.getBilateralResultById`'s `impactAreaScores[] { impact_area, name }`
 * (`results.service.ts:3698-3714`) is the design-noted cross-check for pillar naming — it is
 * sourced from the same `impact_areas_scores_components` table `dac_scores.impact_area_names`
 * already reads, so this mapper does not re-derive names from it separately.
 *
 * A pillar with a `null` `tag_title` (the `*_tag_level_id` column was never answered) is
 * omitted entirely — `[]` / absent means "the result tags no pillar" (not applicable, never
 * grey, no penalty). A pillar the reporter tagged, even as `(0) Not Targeted`, still counts as
 * answered and is included.
 */

/**
 * Pillar short name (the `DAC_PILLAR_CONFIG` / `dac_scores` object key) → the pillar label the
 * form paints. Labels are copied verbatim from the `<strong>` heading of each pillar's tooltip
 * in the bilateral form
 * (`onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/
 * section-general-info.component.ts:33,44,54,64,74`), matching
 * `docs/bilateral-module/integration-contracts.md:614-618`. Keys are copied verbatim from
 * `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:166,171,176,181,186`.
 */
const PILLAR_LABELS: Record<string, string> = {
  gender: 'Gender equality, youth and social inclusion',
  climate_change: 'Climate adaptation and mitigation',
  nutrition: 'Nutrition, health and food security',
  environmental_biodiversity: 'Environmental health and biodiversity',
  poverty: 'Poverty reduction, livelihoods and jobs',
};

/** Iteration order only — the contract does not guarantee/require pillar ordering. */
const PILLAR_KEYS = [
  'gender',
  'climate_change',
  'nutrition',
  'environmental_biodiversity',
  'poverty',
] as const;

/**
 * Frozen visible tag labels, copied verbatim from the bilateral form's own `TAG_LEVELS`
 * (`onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/
 * section-general-info.component.ts:83-85`), matching
 * `docs/bilateral-module/integration-contracts.md:603`.
 *
 * Forward pointer from `T-1b` (recorded in `execution.md`): the value this mapper actually
 * reads (`gender_tag_level.description` via `dac_scores.<pillar>.tag_title`) can come back as
 * `"(0) Not targeted"` (lowercase `t`) — a captured real payload shows exactly that
 * (`onecgiar-pr-server/docs/bilateral-result-summaries.en.md:154`). `normalizeScoreLabel`
 * below maps by the leading `(N)` digit instead of a literal string match, so casing in the
 * catalogue's `description` column never leaks into the payload.
 */
const SCORE_LABELS_BY_LEVEL_DIGIT: Record<string, string> = {
  '0': '(0) Not Targeted',
  '1': '(1) Significant',
  '2': '(2) Principal',
};

/**
 * Normalises whatever `GenderTagLevel.description` returns (frozen casing or not) to the
 * frozen enum. Returns `null` when there is no leading `(0)`/`(1)`/`(2)` to key off — including
 * a `null`/empty `tag_title`, i.e. "this pillar was never tagged".
 */
function normalizeScoreLabel(tagTitle: unknown): string | null {
  if (typeof tagTitle !== 'string') {
    return null;
  }
  const match = /^\((\d)\)/.exec(tagTitle.trim());
  if (!match) {
    return null;
  }
  return SCORE_LABELS_BY_LEVEL_DIGIT[match[1]] ?? null;
}

export function mapImpactAreas(
  detail: Record<string, any>,
): QualityPayloadImpactArea[] {
  const dacScores: Record<string, any> = detail?.dac_scores ?? {};

  const areas: QualityPayloadImpactArea[] = [];
  for (const key of PILLAR_KEYS) {
    const entry = dacScores?.[key];
    const score = normalizeScoreLabel(entry?.tag_title);
    if (!score) {
      // Never tagged — not applicable, omit (never an empty-string / grey placeholder entry).
      continue;
    }

    const subcomponents: string[] = Array.isArray(entry?.impact_area_names)
      ? entry.impact_area_names.filter(
          (name: unknown): name is string =>
            typeof name === 'string' && name.length > 0,
        )
      : [];

    areas.push({
      name: PILLAR_LABELS[key],
      score,
      subcomponents,
    });
  }

  return areas;
}
