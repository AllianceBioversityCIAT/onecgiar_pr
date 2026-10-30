import { Result } from '../../../results/entities/result.entity';

/**
 * IRS-P-10: CLARISA Impact Area id (1-5) -> the `result` tag-level column that stores its score.
 * 1 Nutrition · 2 Poverty · 3 Gender · 4 Climate · 5 Environment.
 */
export const IMPACT_AREA_TAG_COLUMN = {
  1: 'nutrition_tag_level_id',
  2: 'poverty_tag_level_id',
  3: 'gender_tag_level_id',
  4: 'climate_change_tag_level_id',
  5: 'environmental_biodiversity_tag_level_id',
} as const satisfies Record<number, keyof Result>;

export type ImpactAreaId = keyof typeof IMPACT_AREA_TAG_COLUMN;

/** `gender_tag_level` ids: id = score + 1 (see `PT_IMPACT_AREA_COLUMNS`). */
export const IMPACT_TAG_LEVEL_PRINCIPAL = 3; // (2) Principal
export const IMPACT_TAG_LEVEL_NOT_TARGETED = 1; // (0) Not targeted
