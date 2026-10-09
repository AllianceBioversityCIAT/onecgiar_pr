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
    /**
     * `geo.extra_scope` (QAC-T-24): the scopes the form offers in the extra block ("potential impact in other geographic areas").
     * Source: rd-geographic-location.component.html:55-58 renders `app-geoscope-management` with `[hideTobeDetermined]="true"`, and
     * geoscope-management.component.ts:183 adds the "This is yet to be determined" option (id 50) only when that flag is false, so the
     * extra block offers exactly the `geographic_scopes` ids minus 50. Ids 1, 2, 3, 5 and the UNVERIFIED id 4: see the note on
     * `geographic_scopes` above. IPSR keeps `geographic_scopes`.
     */
    extra_geographic_scopes: [1, 2, 3, 4, 5],
    /**
     * `ipsr_step_1.geo_scope` (QAC-T-28): the scopes the IPSR step-1 form offers plus the stored legacy id 4. The form
     * (geoscope-management.component.ts:30-35, :183-184) lists Global 1, Regional 2, Country 3 and Sub-national 5 and, for module
     * `ipsr`, never adds "To be determined" (50), so 50 cannot be an IPSR scope. 4 is the country scope the server WRITES for a
     * single-country package (result-innovation-package.service.ts:301; the step-1 client reads it as 3, step-n1.component.ts:
     * `legacyCountries = 4`). Same ids as `extra_geographic_scopes`, own name because the list is an own concept (see the note on
     * `geographic_scopes` for the UNVERIFIED id 4).
     */
    ipsr_geographic_scopes: [1, 2, 3, 4, 5],
    /**
     * `evidence.is_sharepoint` (QAC-T-17): 0 Link, 1 Upload file. Source: the stored tinyint (evidence.entity.ts) and the form's two
     * hard-coded radio options (evidence-item.component.ts `evidencesType`, booleans there; the server stores `Number(!!is_sharepoint)`,
     * evidences.service.ts:842,894).
     */
    evidence_sources: [0, 1],
    /**
     * `policy_change.amount_status` (QAC-T-21): 1 Confirmed, 2 Estimated, 3 Unknown. Source: the form's hard-coded options
     * (policy-change-info.component.html:28-32, identical in every environment). `results_policy_changes.status_amount` is `text` with
     * no FK (entity :57-62) and no migration seeds the options, so a stored value is not guaranteed to be one of them (contract doc,
     * known gap 15).
     */
    policy_amount_statuses: [1, 2, 3],
    /**
     * Innovation team diversity (QAC-T-18): options of question 112 (113 "Yes, concrete actions...", 114, 115) and, under 113, the
     * action checkboxes 116..121 (121 = "Other"). Source: `result_questions` ids of Innovation P25 questions 101-121, 138, 147-149 are
     * identical in test and prod (owner check, docs/specs/quality-assurance/qa-field-catalog/execution.md "result_questions check run
     * by the owner in test and prod"); no migration in this repository seeds them (cloned from P22 rows by 1762398554711). Structure
     * from innovationTeamDiversityV2 (result-questions.service.ts:761-808: level-2 children of 112, level-3 children of each) and
     * validation_innovation_dev_P25 (parent 112 at :531, parent 113 at :585, ids 113/114/115/121 at :540-602).
     * The GESI / risk stage and consolidated IPR options are NOT here: their ids come from AUTO_INCREMENT (migrations 1787842155469 and
     * 1788441000000) and the client, server and live function resolve them by text.
     */
    question_options_team_diversity: [113, 114, 115],
    question_options_team_diversity_actions: [116, 117, 118, 119, 120, 121],
    /**
     * Length of training (QAC-T-25): the options the form offers, 3 Short-term and 4 Long-term (cap-dev-info.component.ts:98-102 splices the
     * `capdevs_term` rows into [1,2] = degrees and [3,4] = lengths; html:36-45). Source of the rows: 3 = migration
     * 1668784095214-addCapDevMethodsAndTerm.ts (third insert, after PhD and Master), 4 = migration 1668806452093-migrationCaptDev.ts (one later insert).
     */
    capdev_training_lengths: [3, 4],
    /**
     * Degree (QAC-T-25): 1 PhD and 2 Master, the first two `capdevs_term` rows of migration 1668784095214-addCapDevMethodsAndTerm.ts, offered
     * under Long-term only (cap-dev-info.component.html:55-63). Both lists are values of the SAME column `capdev_term_id`: the form stores the
     * degree when there is one and the length otherwise (`term_2 ?? term_1`, cap-dev-info.component.ts:235), so a stored 1 or 2 is
     * "Long-term with that degree" (the load maps it back, .ts:206-209).
     */
    capdev_degrees: [1, 2],
  };
