-- IFC-T-5 checks for validation_innovation_use_P25 (read-only SELECTs only).
--
-- HOW TO RUN
--   1. BEFORE (function not yet changed): run STEP 0, 1, 2, 3, 4. Record the ids Step 2 returns.
--   2. Apply validation_innovation_use_P25.after.sql.
--   3. AFTER: run STEP 0 (new body), then STEP 2b with the SAME ids pasted from the BEFORE run,
--      then 3 and 4. Do NOT compare against a re-run of Step 2: C/D are picked by the CURRENT
--      answered state, so answering a Farmers row between runs moves the id between C and D and
--      the LIMIT window picks other ids. A and B are stable; C/D/E are not guaranteed to be.
--   Prerequisite: result_actors.count_unit / use_nature exist (T-2 migration), also for BEFORE,
--   because the samples read them.
--
-- COVERAGE NOTES
--   * Prod BEFORE: C is probably EMPTY (nobody has answered yet). Fine; C is only compared if present.
--   * Test: to show both directions, pick one D id and leave it unanswered (expect before 1 -> after 0),
--     and answer one other D id (unit + nature) between BEFORE and AFTER (expect its 2b value to go
--     to 1 if the rest of the section is complete). Prefer D ids whose BEFORE value is 1: a result
--     already 0 for another reason hides the effect.
--   * Farmers rows inside a "to be determined" block (innov_use_to_be_determined = 1 for section 1,
--     innov_use_2030_to_be_determined = 1 for section 2) are INTENTIONALLY IGNORED: the function skips
--     that whole block, so such a result is not a D candidate. Samples C/D and Step 4 apply the same rule.
--   * A result with no active results_innovations_use row has the function's TBD defaults (blocks
--     skipped), so it is also excluded from C/D and Step 4.
--
-- Record (fn = validation_innovation_use_P25(result_id); 1 = green, 0 = red):
-- | category | result_id | before | after (2b) | expected after        |
-- |----------|-----------|--------|------------|-----------------------|
-- | A        |           |        |            | = before              |
-- | B        |           |        |            | = before              |
-- | C        |           |        |            | = before              |
-- | D        |           |        |            | 0 (may be 1 before)   |
-- | E        |           |        |            | = before              |
--
-- FALSIFIER (any one = apply failed; roll back with the rollback recipe in after.sql header):
--   * any A, B, C or E id changes value between before and after;
--   * a D id (unanswered Farmers row in an ACTIVE block, other fields complete) still returns 1 after.
-- STEP 3 is indicative only (heavy, run off-peak; counts move with live data): Step 2/2b is the falsifier.

-- =========================================================================
-- STEP 0. DISQUALIFIER: the live body must equal validation_innovation_use_P25.before.sql
-- (BEFORE run) / validation_innovation_use_P25.after.sql (AFTER run). If the BEFORE run differs
-- from the snapshot file: STOP and re-diff, do not apply.
-- =========================================================================
SHOW CREATE FUNCTION validation_innovation_use_P25;

-- =========================================================================
-- STEP 1. Farmers id sanity (design IFC-DD-4 pins actor_type_id = 1; confirm in this environment).
-- =========================================================================
SELECT actor_type_id, name FROM actor_type WHERE actor_type_id = 1;

-- =========================================================================
-- STEP 2. BEFORE run: sample ids per category + the function output. Record the ids.
-- Innovation Use = result_type_id 2. W1/W2 = source not 'API' (NULL = W1/W2).
-- farmer_rows_incomplete uses the function's own predicate (IS NULL OR NOT IN), active blocks only.
-- =========================================================================
SELECT category, result_id, phase_year, source, farmer_rows_in_active_blocks, farmer_rows_incomplete,
       validation_innovation_use_P25(result_id) AS fn_value
FROM (
    (SELECT 'A 2025 W1/W2 with Farmers' AS category, r.id AS result_id, v.phase_year, r.`source`,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete
     FROM `result` r JOIN version v ON v.id = r.version_id
     WHERE r.is_active = 1 AND r.result_type_id = 2 AND v.phase_year = 2025 AND COALESCE(r.`source`, '') <> 'API' AND EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1)
     ORDER BY r.id LIMIT 5)
    UNION ALL
    (SELECT 'B 2026 bilateral with Farmers' AS category, r.id AS result_id, v.phase_year, r.`source`,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete
     FROM `result` r JOIN version v ON v.id = r.version_id
     WHERE r.is_active = 1 AND r.result_type_id = 2 AND v.phase_year = 2026 AND r.`source` = 'API' AND EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1)
     ORDER BY r.id LIMIT 5)
    UNION ALL
    (SELECT 'C 2026 W1/W2 Farmers all answered (active blocks)' AS category, r.id AS result_id, v.phase_year, r.`source`,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete
     FROM `result` r JOIN version v ON v.id = r.version_id
     WHERE r.is_active = 1 AND r.result_type_id = 2 AND v.phase_year = 2026 AND COALESCE(r.`source`, '') <> 'API' AND EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AND NOT EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied')))
     ORDER BY r.id LIMIT 5)
    UNION ALL
    (SELECT 'D 2026 W1/W2 Farmers unanswered (active blocks)' AS category, r.id AS result_id, v.phase_year, r.`source`,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete
     FROM `result` r JOIN version v ON v.id = r.version_id
     WHERE r.is_active = 1 AND r.result_type_id = 2 AND v.phase_year = 2026 AND COALESCE(r.`source`, '') <> 'API' AND EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied')))
     ORDER BY r.id LIMIT 5)
    UNION ALL
    (SELECT 'E 2026 W1/W2 without Farmers' AS category, r.id AS result_id, v.phase_year, r.`source`,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
            (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete
     FROM `result` r JOIN version v ON v.id = r.version_id
     WHERE r.is_active = 1 AND r.result_type_id = 2 AND v.phase_year = 2026 AND COALESCE(r.`source`, '') <> 'API' AND NOT EXISTS (SELECT 1 FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1)
     ORDER BY r.id LIMIT 5)
) samples
ORDER BY category, result_id;

-- =========================================================================
-- STEP 2b. AFTER run: re-evaluate the SAME ids recorded in the BEFORE run of Step 2.
-- Replace the 0 placeholder with the pasted ids, e.g. IN (101, 102, 103). Compare with BEFORE.
-- =========================================================================
SELECT r.id AS result_id, v.phase_year, r.`source`,
       (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))) AS farmer_rows_in_active_blocks,
       (SELECT COUNT(*) FROM result_actors ra WHERE ra.result_id = r.id AND ra.is_active = 1 AND ra.actor_type_id = 1 AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0))) AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))) AS farmer_rows_incomplete_now,
       validation_innovation_use_P25(r.id) AS fn_value_after
FROM `result` r JOIN version v ON v.id = r.version_id
WHERE r.id IN (0 /* paste the Step 2 result_ids from the BEFORE run */)
ORDER BY r.id;

-- =========================================================================
-- STEP 3. Aggregate view (INDICATIVE ONLY, heavy: one function call per result; run off-peak).
-- Expected after: '2025 and earlier W1/W2' and 'bilateral' counts identical to before (if no live
-- edits in between); only '2026 W1/W2' may lose greens (replicated Farmers rows, IFC-RK-1).
-- =========================================================================
SELECT grp, fn_value, COUNT(*) AS results
FROM (
    SELECT CASE
               WHEN r.`source` = 'API' THEN 'bilateral (any phase)'
               WHEN v.phase_year >= 2026 THEN '2026 W1/W2'
               WHEN v.phase_year < 2026 THEN '2025 and earlier W1/W2'
               ELSE 'other'
           END AS grp,
           validation_innovation_use_P25(r.id) AS fn_value
    FROM `result` r JOIN version v ON v.id = r.version_id
    WHERE r.is_active = 1 AND r.result_type_id = 2
) t
GROUP BY grp, fn_value
ORDER BY grp, fn_value;

-- =========================================================================
-- STEP 4. Size of the effect (proposal R-1, narrowed to ACTIVE blocks): 2026 W1/W2 results with an
-- incomplete Farmers row in a block that the function actually evaluates. Pure data: same before
-- and after. These are the results that can turn red (if the rest of the section was green).
-- =========================================================================
SELECT ra.section_id,
       COUNT(DISTINCT ra.result_id) AS results_2026_w1w2_with_incomplete_farmers,
       COUNT(*) AS farmer_rows
FROM result_actors ra
JOIN `result` r ON r.id = ra.result_id AND r.is_active = 1
JOIN version v ON v.id = r.version_id
WHERE ra.is_active = 1 AND ra.actor_type_id = 1
  AND v.phase_year = 2026 AND r.result_type_id = 2
  AND COALESCE(r.`source`, '') <> 'API'
  AND EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined, 0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined, 0) = 0)))
  AND (ra.count_unit IS NULL OR ra.count_unit NOT IN ('households', 'individuals') OR ra.use_nature IS NULL OR ra.use_nature NOT IN ('information_received', 'innovation_applied'))
GROUP BY ra.section_id;
