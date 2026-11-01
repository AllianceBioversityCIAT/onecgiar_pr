// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-1, IRD-DD-7, IRD-DD-9)
import { IMPACT_AREAS } from '../../pages/result-framework-reporting/shared/report-result/impact-areas.constant';

export const IMPACT_RESULT_TYPE_ID = 9;
export const IMPACT_RESULT_DISPLAY_NAME = 'Impact result';
const P25_ACRONYM = 'P25';
const TAG_LEVEL_PRINCIPAL = 3;

/** CLARISA impact area id (1-5) -> `result` tag-level column (mirrors the server IMPACT_AREA_TAG_COLUMN). */
const IMPACT_AREA_TAG_COLUMN: Record<number, string> = {
  1: 'nutrition_tag_level_id',
  2: 'poverty_tag_level_id',
  3: 'gender_tag_level_id',
  4: 'climate_change_tag_level_id',
  5: 'environmental_biodiversity_tag_level_id'
};

/** Impact result = result type 9 AND portfolio P25. */
export function isP25ImpactResult(result: { result_type_id?: number | string | null; portfolio?: string | null } | null | undefined): boolean {
  return Number(result?.result_type_id) === IMPACT_RESULT_TYPE_ID && String(result?.portfolio ?? '').toUpperCase() === P25_ACRONYM;
}

/** Display label only: type 9 reads "Impact result"; every other type keeps its DB name. */
export function resultTypeDisplayName(typeId: number | string | null | undefined, dbName: string | null | undefined): string {
  return Number(typeId) === IMPACT_RESULT_TYPE_ID ? IMPACT_RESULT_DISPLAY_NAME : (dbName ?? '');
}

/**
 * Label for type-filter options that span P22 + P25 (Results Center "Indicator category", previous-results picker):
 * type 9 is an "Impact contribution" in P22 and an "Impact result" in P25, so it reads both. Only the label changes.
 */
export function resultTypeFilterLabel(typeId: number | string | null | undefined, dbName: string | null | undefined): string {
  if (String(dbName ?? '').startsWith(IMPACT_RESULT_DISPLAY_NAME)) return dbName;
  return Number(typeId) === IMPACT_RESULT_TYPE_ID ? `${IMPACT_RESULT_DISPLAY_NAME} / ${dbName || 'Impact contribution'}` : (dbName ?? '');
}

/** Names of the impact areas scored Principal (tag level id 3), in impact-area id order. */
export function principalImpactAreaNames(result: Record<string, any> | null | undefined): string[] {
  return IMPACT_AREAS.filter(area => Number(result?.[IMPACT_AREA_TAG_COLUMN[area.id]]) === TAG_LEVEL_PRINCIPAL).map(area => area.name);
}
