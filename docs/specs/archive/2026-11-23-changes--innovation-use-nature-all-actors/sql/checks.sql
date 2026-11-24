-- checks.sql — INA-T-7 / INA-R-10 / INA-AC-7 (changes/innovation-use-nature-all-actors, INC-168062)
-- READ-ONLY. Only SELECT and SHOW statements. No UPDATE / INSERT / DELETE / DDL anywhere in this file.
--
-- HOW TO RUN (prtest first, then prod)
--   1. BEFORE applying: run V0 and S1..S5 below, one statement at a time, and save the output.
--   2. Apply validation_innovation_use_P25.after.sql (SQL Editor tab) or the .after.body-only.sql (DBeaver routine editor).
--   3. AFTER applying: run V0 and S1..S5 again and compare with the saved output (expected changes are under each query).
--
-- Names confirmed at the source: result.id / result_type_id (2 = Innovation Use, ResultTypeEnum) / status_id / source
-- (nullable enum, so NULL = W1/W2) / is_active / version_id; version.phase_year; results_innovations_use.results_id /
-- innov_use_to_be_determined / innov_use_2030_to_be_determined / is_active; result_actors.result_actors_id / result_id /
-- actor_type_id / section_id (1 = current use, 2 = 2030) / count_unit / use_nature / is_active.
-- Common filter = the function's own: result JOIN version (phase_year >= 2026), source NULL or not 'API', and a block that is
-- not "to be determined" (section 1 -> innov_use_to_be_determined, section 2 -> innov_use_2030_to_be_determined; NULL or 0).
-- "Non-Farmers" is written NOT (ra.actor_type_id <=> 1) so a NULL actor_type_id is covered, as the function's check (b) has no
-- actor_type_id filter. Farmers = actor_type_id 1.


-- =====================================================================================================================
-- V0 (sanity). Which version of the function is live?
-- BEFORE: the body has no 'INA-R-10' text and the use_nature test sits inside the Farmers-only block.
-- AFTER : the body contains 'INA-R-10 (NEW, INC-168062)' twice and has_ina_r_10 = 1.
-- =====================================================================================================================
SHOW CREATE FUNCTION validation_innovation_use_P25;

SELECT ROUTINE_NAME,
       DEFINER,
       LAST_ALTERED,
       (ROUTINE_DEFINITION LIKE '%INA-R-10%') AS has_ina_r_10   -- NULL if the user lacks the privilege to see the body
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_NAME = 'validation_innovation_use_P25';


-- =====================================================================================================================
-- S1. 2026 W1/W2 results with an active non-Farmers actor row (section 1 or 2) whose use_nature is NULL or invalid.
-- These turn NOT green after the change (INA-R-10 scenario "Researchers without nature").
-- BEFORE: the "green_now" column counts the ones that are green today (these are the ones that will flip).
-- AFTER : results_affected is unchanged, green_now = 0 (every one of them is now not green).
-- =====================================================================================================================
-- S1a. Counts.
SELECT COUNT(DISTINCT r.id)                                              AS results_affected,
       COUNT(*)                                                          AS actor_rows,
       COUNT(DISTINCT CASE WHEN validation_innovation_use_P25(r.id) = 1
                           THEN r.id END)                                AS green_now
FROM `result` r
     INNER JOIN version v                 ON v.id = r.version_id
     INNER JOIN results_innovations_use riu ON riu.results_id = r.id AND riu.is_active = TRUE
     INNER JOIN result_actors ra          ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND COALESCE(r.`source`, '') <> 'API'
  AND ((ra.section_id = 1 AND (riu.innov_use_to_be_determined IS NULL OR riu.innov_use_to_be_determined = 0))
    OR (ra.section_id = 2 AND (riu.innov_use_2030_to_be_determined IS NULL OR riu.innov_use_2030_to_be_determined = 0)))
  AND NOT (ra.actor_type_id <=> 1)
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'));

-- S1b. Up to 50 ids, with the function value. BEFORE: validation = 1 for the ones that will flip. AFTER: validation = 0.
SELECT r.id                                       AS result_id,
       r.status_id,
       v.phase_year,
       COUNT(*)                                   AS rows_missing_nature,
       validation_innovation_use_P25(r.id)        AS validation
FROM `result` r
     INNER JOIN version v                 ON v.id = r.version_id
     INNER JOIN results_innovations_use riu ON riu.results_id = r.id AND riu.is_active = TRUE
     INNER JOIN result_actors ra          ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND COALESCE(r.`source`, '') <> 'API'
  AND ((ra.section_id = 1 AND (riu.innov_use_to_be_determined IS NULL OR riu.innov_use_to_be_determined = 0))
    OR (ra.section_id = 2 AND (riu.innov_use_2030_to_be_determined IS NULL OR riu.innov_use_2030_to_be_determined = 0)))
  AND NOT (ra.actor_type_id <=> 1)
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))
GROUP BY r.id, r.status_id, v.phase_year
ORDER BY r.id
LIMIT 50;


-- =====================================================================================================================
-- S2. The same results, once answered, stay (or become) green.
-- INSTRUCTION (no UPDATE here; do it through the PRMS TEST form, as a user would):
--   a. Take one id from S1b (validation = 0 AFTER the change).
--   b. Open that result on prtest, Innovation use section, and answer the nature question on every row listed by the query
--      below (current use and 2030 blocks), then Save.
--   c. Re-run the S2 query with that id in the filter line. EXPECTED: no rows, and validation = 1 (if the rest of the
--      section is complete; any other missing piece keeps it 0 for a reason unrelated to INA-R-10).
-- The query lists, per result id and per row, which active rows are missing a nature. Put an id on the marked line to focus
-- on one result; with the line left commented it lists every affected result (up to 200 rows).
-- =====================================================================================================================
SELECT r.id                                       AS result_id,
       ra.section_id,
       ra.result_actors_id,
       ra.actor_type_id,
       ra.use_nature                              AS use_nature_stored,    -- NULL or an invalid value
       validation_innovation_use_P25(r.id)        AS validation
FROM `result` r
     INNER JOIN version v                 ON v.id = r.version_id
     INNER JOIN results_innovations_use riu ON riu.results_id = r.id AND riu.is_active = TRUE
     INNER JOIN result_actors ra          ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND COALESCE(r.`source`, '') <> 'API'
  AND ((ra.section_id = 1 AND (riu.innov_use_to_be_determined IS NULL OR riu.innov_use_to_be_determined = 0))
    OR (ra.section_id = 2 AND (riu.innov_use_2030_to_be_determined IS NULL OR riu.innov_use_2030_to_be_determined = 0)))
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))
  -- AND r.id = 0   -- <- replace 0 by the result id from S1b and uncomment
ORDER BY r.id, ra.section_id, ra.result_actors_id
LIMIT 200;


-- =====================================================================================================================
-- S3. W3 (source = 'API') results with a NULL or invalid use_nature on non-Farmers rows: the function value MUST NOT change.
-- Save the validation column BEFORE, compare AFTER: it must be identical for every id (INA-R-10 scenario "W3 result unaffected").
-- =====================================================================================================================
-- S3a. Count.
SELECT COUNT(DISTINCT r.id) AS w3_results_with_null_nature,
       COUNT(*)             AS actor_rows
FROM `result` r
     INNER JOIN version v        ON v.id = r.version_id
     INNER JOIN result_actors ra ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND r.`source` = 'API'
  AND ra.section_id IN (1, 2)
  AND NOT (ra.actor_type_id <=> 1)
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'));

-- S3b. Ids with the function value (up to 200).
SELECT r.id                                       AS result_id,
       r.status_id,
       COUNT(*)                                   AS rows_missing_nature,
       validation_innovation_use_P25(r.id)        AS validation          -- must be identical before and after
FROM `result` r
     INNER JOIN version v        ON v.id = r.version_id
     INNER JOIN result_actors ra ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND r.`source` = 'API'
  AND ra.section_id IN (1, 2)
  AND NOT (ra.actor_type_id <=> 1)
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))
GROUP BY r.id, r.status_id
ORDER BY r.id
LIMIT 200;


-- =====================================================================================================================
-- S4. Farmers rows (actor_type_id = 1) with a NULL count_unit in a 2026 W1/W2 non-TBD block are still caught.
-- EXPECTED both BEFORE and AFTER: green_now = 0 (the Farmers check on count_unit is kept, only its use_nature half moved).
-- The counts themselves must be identical before and after.
-- =====================================================================================================================
SELECT COUNT(DISTINCT r.id)                                              AS results_with_null_count_unit,
       COUNT(*)                                                          AS farmer_rows,
       COUNT(DISTINCT CASE WHEN validation_innovation_use_P25(r.id) = 1
                           THEN r.id END)                                AS green_now   -- expected 0
FROM `result` r
     INNER JOIN version v                 ON v.id = r.version_id
     INNER JOIN results_innovations_use riu ON riu.results_id = r.id AND riu.is_active = TRUE
     INNER JOIN result_actors ra          ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND COALESCE(r.`source`, '') <> 'API'
  AND ((ra.section_id = 1 AND (riu.innov_use_to_be_determined IS NULL OR riu.innov_use_to_be_determined = 0))
    OR (ra.section_id = 2 AND (riu.innov_use_2030_to_be_determined IS NULL OR riu.innov_use_2030_to_be_determined = 0)))
  AND ra.actor_type_id = 1
  AND ra.count_unit IS NULL;


-- =====================================================================================================================
-- S5 (OQ-1 impact). How many existing 2026 W1/W2 Innovation Use results that are green today turn not green (yellow),
-- split by status. Corrected from proposal.md section 12.1 (see "Corrections" below).
-- RUN BEFORE APPLYING: green_today_will_turn_not_green is the number to report. AFTER applying it must read 0 (they are not green
-- any more) while results_with_missing_nature stays the same.
--
-- Corrections to the proposal section 12.1 query (names were UNVERIFIED there):
--   * r.source <> 'API' is NULL-unsafe (source is nullable, default 'Result'): rows with a NULL source were dropped; the
--     function uses COALESCE(source, '') <> 'API'.
--   * ra.actor_type_id <> 1 drops NULL actor types; replaced by NOT (ra.actor_type_id <=> 1).
--   * Only "use_nature IS NULL" was tested; the function also rejects a value outside the two codes.
--   * It did not restrict to section_id IN (1, 2) nor skip "to be determined" blocks (results_innovations_use flags), so it
--     counted rows the function never evaluates, and it did not ask for "green today". Both are added here.
-- Confirmed as written: result.result_type_id = 2, result.status_id, version.phase_year, result_actors.is_active.
-- =====================================================================================================================
SELECT r.status_id,
       CASE r.status_id
            WHEN 1 THEN 'Editing'
            WHEN 2 THEN 'Quality Assessed'
            WHEN 3 THEN 'Submitted'
            ELSE CONCAT('Other (', r.status_id, ')')
       END                                                               AS status_name,
       COUNT(DISTINCT r.id)                                              AS results_with_missing_nature,
       COUNT(DISTINCT CASE WHEN validation_innovation_use_P25(r.id) = 1
                           THEN r.id END)                                AS green_today_will_turn_not_green,
       COUNT(*)                                                          AS actor_rows
FROM `result` r
     INNER JOIN version v                 ON v.id = r.version_id
     INNER JOIN results_innovations_use riu ON riu.results_id = r.id AND riu.is_active = TRUE
     INNER JOIN result_actors ra          ON ra.result_id = r.id AND ra.is_active = TRUE
WHERE r.is_active = TRUE
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND COALESCE(r.`source`, '') <> 'API'
  AND ((ra.section_id = 1 AND (riu.innov_use_to_be_determined IS NULL OR riu.innov_use_to_be_determined = 0))
    OR (ra.section_id = 2 AND (riu.innov_use_2030_to_be_determined IS NULL OR riu.innov_use_2030_to_be_determined = 0)))
  AND NOT (ra.actor_type_id <=> 1)
  AND (ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))
GROUP BY r.status_id
ORDER BY r.status_id;
