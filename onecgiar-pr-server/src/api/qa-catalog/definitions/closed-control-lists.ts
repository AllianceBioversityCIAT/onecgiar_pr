// @akili-spec quality-assurance/qa-field-catalog
/**
 * Amendment v1.9 (D): control lists whose ids are a FIXED, code- or seed-defined set. When a condition
 * compares a select over one of these lists, the shape validator checks every compared id against it.
 *
 * Only lists with an authoritative source in this repository are declared. Reference lists (results,
 * projects, directory_users, institutions, initiatives, centers, countries, regions, ...) change at runtime
 * and are NOT checked.
 *
 * UNVERIFIED (left out on purpose, no authoritative source in the repo, so no ids are invented):
 *  - `geographic_scopes`  (clarisa_geographic_scope, synced from CLARISA; conditions use 1..5 as scope ids)
 *  - `innovation_use_levels` (CLARISA use levels; see the D28 note in sections/innovation-use.ts)
 *  - `innovation_types` (CLARISA; `innovation_dev.nature eq 12`)
 *  - `discontinued_reasons` (`investment_discontinued_option`, rows added over time by migration
 *    1712162692416 and by admins; ids are not a fixed set)
 *  - `readiness_levels`, `toc_levels`, `toc_results`, ... (reference data, not compared by id)
 */
export const CLOSED_CONTROL_LISTS: Readonly<Record<string, readonly number[]>> =
  {
    /**
     * `gender_tag_level` (also used by the climate, nutrition, environment and poverty tags):
     * 1 Not Targeted, 2 Significant, 3 Principal.
     * Source: migration 1666187001104-genderTagData.ts (DELETE + AUTO_INCREMENT = 1, then inserts in that order);
     * the live validation function also treats `*_tag_level_id = 3` as the tagged level
     * (migration 1762528725798-createValidtionP25.ts).
     */
    tag_levels: [1, 2, 3],
    /**
     * `result_type` ids. Source: `ResultTypeEnum` (src/shared/constants/result-type.enum.ts); ids 10 and 11 are
     * also created by migrations 1678377954156 and 1679950152650.
     */
    result_types: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    /**
     * `assessed_during_expert_workshop` rows. Source: migration 1684849314892 (three inserts into a freshly created
     * table, ids 1..3; id 2 renamed by migration 1685138922752).
     */
    assessed_workshop_options: [1, 2, 3],
  };
