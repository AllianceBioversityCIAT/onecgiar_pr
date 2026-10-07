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
    /**
     * `clarisa_geographic_scope` ids a result can store (QAC-T-16; the DB was unreachable (VPN), so the rows were not read):
     *  - 1 Global, 2 Regional, 3 Country, 5 Sub-national: client `GeoScopeEnum` (shared/enum/geo-scope.enum.ts) and the server's own
     *    scope mapping (results.service.ts:2609-2622); rows come from the CLARISA sync, no seed in this repository.
     *  - 50 To be determined: seeded by migration 1667327277664-InsertCustomScope (`INSERT ... VALUES (50, ...)`).
     *  - 4: UNVERIFIED as a catalog row (neither the enum nor a seed names it), kept because stored data holds it and conditions must be
     *    able to name it: the server WRITES it (result-innovation-package.service.ts:301, a single-country package), the live function
     *    treats `IN (3, 4)` alike (V-GEO:93), the server folds it into 3 on read (result.repository.ts:573, results.service.ts:2616-2619)
     *    and the client reads it as Country (`legacyCountries = 4`, rd-geographic-location.component.ts:292). The FK
     *    `result.geographic_scope_id -> clarisa_geographic_scope.id` implies the row exists wherever those writes succeed. Inventory D24.
     */
    geographic_scopes: [1, 2, 3, 4, 5, 50],
  };
