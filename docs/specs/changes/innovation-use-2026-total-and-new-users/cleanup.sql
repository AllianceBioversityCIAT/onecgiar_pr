-- =====================================================================================
-- IU26-T-8 -- Cleanup of the existing 2026 Innovation Use copies (HITL, PROD, run by Santiago)
-- Spec: docs/specs/changes/innovation-use-2026-total-and-new-users/  (design.md 5.5, DD-7, DD-11;
--       requirements.md IU26-R-10; settles P-19)
-- Engine: MySQL (server TypeORM config: onecgiar-pr-server/src/config/orm.config.ts:8 `type: 'mysql'`).
--
-- WHAT IT DOES
--   Soft-deletes (is_active = 0) the actors / role-5 organizations / P25 measures that the 2025 -> 2026
--   phase change copied into a 2026 Innovation Use result and that nobody edited since, so the 2026
--   result opens with an empty "new use" table (the 2025 numbers stay visible in the CUU block).
--
-- NEVER RUN THIS FILE AS A WHOLE. Run it block by block, in order. Nothing here is executed by an agent.
-- Run PART 0 and PART 1 first (read-only apart from session temp tables and the reviewed-list record of 1-F). PART 2 only after PR-1 is deployed AND Santiago reviewed PART 1.
--
-- SESSION RULES
--   * Use ONE session/tab for PART 0..PART 3 (temporary tables + @variables live in the session).
--   * DDL (CREATE TABLE / ALTER TABLE) commits implicitly in MySQL, so ALL DDL is placed BEFORE
--     `START TRANSACTION`; only INSERT/UPDATE live inside the transaction.
--   * Replace the token YYYYMMDD in the three bkp_iu26_* names (find/replace, whole file) with the run date.
--   * The three backup tables are persistent; they are the rollback source. Never drop them.
--
-- VALUE COLUMNS compared (the "multiset of value columns"). Excluded on purpose: surrogate ids, result_id /
-- results_id, section_id (NULL and 1 are both "considered" rows), created/updated timestamps, created_by,
-- last_updated_by, is_active.
--   result_actors  (entity: onecgiar-pr-server/src/api/results/result-actors/entities/result-actor.entity.ts,
--                   table `result_actors` :13; PK result_actors_id :15-19)
--       women :21-26, women_youth :28-33, men :35-40, men_youth :42-47, other_actor_type :49-54,
--       sex_and_age_disaggregation :56-62, age_disaggregation_not_available :70-75,
--       youth_split_applied_by_system :84-89, how_many :91-96, count_unit :102-108, use_nature :114-120,
--       has_women, has_women_youth, has_men, has_men_youth (:122-148 region), addressing_demands (:150-155 region),
--       actor_type_id (:176-181 region). Line numbers after :120 are read to within a few lines.
--       Row-scope columns: section_id (:~162-167), result_id (:~169-173), is_active + audit via
--       shared/entities/base-entity.ts:3-39 (created_date, last_updated_date).
--   results_by_institution_type  (entity: .../results/results_by_institution_types/entities/
--                   results_by_institution_type.entity.ts; @Entity() :16 -> table `results_by_institution_type`,
--                   confirmed by migrations/1663773959336-resultsdatamodel.ts:35; PK id :18-21)
--       how_many :23-28, other_institution :30-35, graduate_students :37-42, addressing_demands :44-49,
--       institution_types_id :71-76.
--       Row-scope columns: section_id :55-60, results_id :64-69, institution_roles_id :78-83 (NOT NULL),
--       is_active :109-115. NOTE this entity does not extend BaseEntity: its timestamp is `creation_date`.
--   result_ip_measure  (entity: .../api/ipsr/result-ip-measures/entities/result-ip-measure.entity.ts,
--                   table `result_ip_measure` :13; PK result_ip_measure_id :15-19)
--       unit_of_measure :21-26, quantity :28-33 (float), addressing_demands :35-40.
--       Row-scope columns: section_id :46-51, result_id :55-60, is_active via BaseEntity.
--   result / version  (.../results/entities/result.entity.ts: result_code :66, result_type_id :86/:94,
--                   version_id :267/:275, created_date :293, status_id :328/:337, source :506 (enum
--                   SourceEnum :51-54: 'Result' = W1/W2, 'API' = Bilateral/W3);
--                   .../api/versioning/entities/version.entity.ts: table `version` :12, phase_year :57-61,
--                   previous_phase :72-76)
--   Legacy results_innovations_use_measures: .../results/summary/entities/results-innovations-use-measures.entity.ts
--                   (is_active :54-59, result_innovation_use_id :27-29). NEVER modified (DD-11), only counted.
--
-- PREVIOUS-RESULT JOIN = the one of InnovUseExists
--   onecgiar-pr-server/src/api/results/summary/repositories/results-innovations-use.repository.ts:227,231,248-257:
--   version v (is_active=1) on r.version_id; previous_v on previous_v.id = v.previous_phase (is_active=1);
--   previous_r on same result_code AND version_id = previous_v.id AND is_active=1.
--   (InnovUseExists also INNER JOINs an active results_innovations_use row :235-237. This script does NOT
--   require it: the rows being cleaned hang from result_id, not from that row. Judgment call; UNVERIFIED that
--   every candidate has one -- PART 1 query 1f counts the candidates without it.)
--
-- ORG PREDICATE (reviewer note A-4): `institution_roles_id = 5` only. NULL roles, 1 and 2 never match.
--   (The column is NOT NULL in the entity, :78-83, so a NULL cannot occur; the equality is still NULL-safe
--   by construction: `NULL = 5` is never true.)
-- =====================================================================================


-- =====================================================================================
-- PART 0 -- Parameters + pre-flight (read-only)
-- =====================================================================================

-- NOTE: paste @deploy_cutoff EXACTLY (same string, same time zone) in PART 0, in 1-F's session and again in 2-A: the
-- reviewed list stores it and the gate compares it, so any difference fails closed.
-- FILL THIS IN: the PR-1 deploy timestamp (server time of the DB; PROD DB is UTC). Results created AFTER it
-- were born under the new copy rules and are never touched.
SET @deploy_cutoff = NULL;   -- e.g. '2026-11-27 14:05:00'  <-- FILL IN
SET @phase_year    = 2026;

SELECT IF(@deploy_cutoff IS NULL, 'STOP: fill @deploy_cutoff', CONCAT('cutoff = ', @deploy_cutoff)) AS cutoff_check;

-- Multiset signatures can be long; make sure GROUP_CONCAT does not truncate.
SET SESSION group_concat_max_len = 67108864;

-- 0a. Schema pre-flight: every column used below must exist. EXPECT 0 ROWS.
SELECT x.t AS missing_table, x.c AS missing_column
FROM (
  SELECT 'result_actors' t, 'result_actors_id' c UNION ALL SELECT 'result_actors','result_id' UNION ALL
  SELECT 'result_actors','section_id' UNION ALL SELECT 'result_actors','is_active' UNION ALL
  SELECT 'result_actors','women' UNION ALL SELECT 'result_actors','women_youth' UNION ALL
  SELECT 'result_actors','men' UNION ALL SELECT 'result_actors','men_youth' UNION ALL
  SELECT 'result_actors','other_actor_type' UNION ALL SELECT 'result_actors','sex_and_age_disaggregation' UNION ALL
  SELECT 'result_actors','age_disaggregation_not_available' UNION ALL SELECT 'result_actors','youth_split_applied_by_system' UNION ALL
  SELECT 'result_actors','how_many' UNION ALL SELECT 'result_actors','count_unit' UNION ALL
  SELECT 'result_actors','use_nature' UNION ALL SELECT 'result_actors','has_women' UNION ALL
  SELECT 'result_actors','has_women_youth' UNION ALL SELECT 'result_actors','has_men' UNION ALL
  SELECT 'result_actors','has_men_youth' UNION ALL SELECT 'result_actors','addressing_demands' UNION ALL
  SELECT 'result_actors','actor_type_id' UNION ALL
  SELECT 'results_by_institution_type','id' UNION ALL SELECT 'results_by_institution_type','results_id' UNION ALL
  SELECT 'results_by_institution_type','section_id' UNION ALL SELECT 'results_by_institution_type','is_active' UNION ALL
  SELECT 'results_by_institution_type','institution_roles_id' UNION ALL SELECT 'results_by_institution_type','institution_types_id' UNION ALL
  SELECT 'results_by_institution_type','how_many' UNION ALL SELECT 'results_by_institution_type','other_institution' UNION ALL
  SELECT 'results_by_institution_type','graduate_students' UNION ALL SELECT 'results_by_institution_type','addressing_demands' UNION ALL
  SELECT 'result_ip_measure','result_ip_measure_id' UNION ALL SELECT 'result_ip_measure','result_id' UNION ALL
  SELECT 'result_ip_measure','section_id' UNION ALL SELECT 'result_ip_measure','is_active' UNION ALL
  SELECT 'result_ip_measure','unit_of_measure' UNION ALL SELECT 'result_ip_measure','quantity' UNION ALL
  SELECT 'result_ip_measure','addressing_demands' UNION ALL
  SELECT 'result','id' UNION ALL SELECT 'result','result_code' UNION ALL SELECT 'result','result_type_id' UNION ALL
  SELECT 'result','version_id' UNION ALL SELECT 'result','status_id' UNION ALL SELECT 'result','source' UNION ALL
  SELECT 'result','created_date' UNION ALL SELECT 'result','is_active' UNION ALL
  SELECT 'version','id' UNION ALL SELECT 'version','phase_year' UNION ALL SELECT 'version','previous_phase' UNION ALL
  SELECT 'version','is_active' UNION ALL
  SELECT 'results_innovations_use_measures','result_innovation_use_id' UNION ALL
  SELECT 'results_innovations_use_measures','is_active' UNION ALL
  SELECT 'results_innovations_use','result_innovation_use_id' UNION ALL SELECT 'results_innovations_use','results_id' UNION ALL
  SELECT 'results_innovations_use','is_active'
) x
LEFT JOIN information_schema.columns ic
  ON ic.table_schema = DATABASE() AND ic.table_name = x.t AND ic.column_name = x.c
WHERE ic.column_name IS NULL;


-- =====================================================================================
-- PART 1 -- DRY RUN (read-only; session TEMPORARY tables + the one reviewed-list record of 1-F)
-- RULE: MySQL error 1137 forbids naming the same TEMPORARY table twice in one statement (UNION branches
-- included). Every statement below names each tmp_iu26_* table at most once; keep it that way.
-- =====================================================================================

-- 1-A. Candidates: type 2, phase_year 2026, status 1, active, previous result found by the InnovUseExists join,
--      created on/before the deploy cutoff. PK on result_id: a duplicated previous match aborts the INSERT loudly.
DROP TEMPORARY TABLE IF EXISTS tmp_iu26_cand;
CREATE TEMPORARY TABLE tmp_iu26_cand (
  result_id INT NOT NULL PRIMARY KEY,
  prev_id   INT NOT NULL,
  source    VARCHAR(20) NULL,
  status_id INT NULL
);
INSERT INTO tmp_iu26_cand (result_id, prev_id, source, status_id)
SELECT r.id, pr.id, r.source, r.status_id
FROM result r
JOIN version v  ON v.id = r.version_id AND v.is_active = 1
JOIN version pv ON pv.id = v.previous_phase AND pv.is_active = 1
JOIN result pr  ON pr.result_code = r.result_code AND pr.version_id = pv.id AND pr.is_active = 1
WHERE r.result_type_id = 2
  AND r.is_active = 1
  AND r.status_id = 1
  AND v.phase_year = @phase_year
  AND r.created_date <= @deploy_cutoff;

-- 1-B. Per-result signatures of the CONSIDERED rows, target side (sig_t) and previous side (sig_p).
--      Two separate temp tables because MySQL cannot reopen one TEMPORARY table twice in a query.
--      Row signature = CONCAT_WS(CHAR(31), IFNULL(CAST(col AS CHAR),'<NULL>'), ...) -> NULL-safe.
--      Multiset = GROUP_CONCAT of the row signatures ordered by CAST(sig AS BINARY), so order never matters and a
--      case-only edit still counts as an edit.
DROP TEMPORARY TABLE IF EXISTS tmp_iu26_sig_t;
DROP TEMPORARY TABLE IF EXISTS tmp_iu26_sig_p;
CREATE TEMPORARY TABLE tmp_iu26_sig_t (
  result_id INT NOT NULL PRIMARY KEY,
  a_n INT NOT NULL, o_n INT NOT NULL, m_n INT NOT NULL,
  a_sigs LONGTEXT NOT NULL, o_sigs LONGTEXT NOT NULL, m_sigs LONGTEXT NOT NULL
);
CREATE TEMPORARY TABLE tmp_iu26_sig_p LIKE tmp_iu26_sig_t;

INSERT INTO tmp_iu26_sig_t
SELECT c.result_id,
       IFNULL(a.n,0), IFNULL(o.n,0), IFNULL(m.n,0),
       IFNULL(a.sigs,''), IFNULL(o.sigs,''), IFNULL(m.sigs,'')
FROM tmp_iu26_cand c
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT ra.result_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(ra.women AS CHAR),'<NULL>'), IFNULL(CAST(ra.women_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.men AS CHAR),'<NULL>'), IFNULL(CAST(ra.men_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.other_actor_type AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.sex_and_age_disaggregation AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.age_disaggregation_not_available AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.youth_split_applied_by_system AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.how_many AS CHAR),'<NULL>'), IFNULL(CAST(ra.count_unit AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.use_nature AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.has_women AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_women_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.has_men AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_men_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.addressing_demands AS CHAR),'<NULL>'), IFNULL(CAST(ra.actor_type_id AS CHAR),'<NULL>')
           ) sig
    FROM result_actors ra
    WHERE ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1)
  ) x GROUP BY x.rid
) a ON a.rid = c.result_id
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT rbit.results_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(rbit.institution_types_id AS CHAR),'<NULL>'), IFNULL(CAST(rbit.how_many AS CHAR),'<NULL>'),
             IFNULL(CAST(rbit.other_institution AS CHAR),'<NULL>'), IFNULL(CAST(rbit.graduate_students AS CHAR),'<NULL>'),
             IFNULL(CAST(rbit.addressing_demands AS CHAR),'<NULL>')
           ) sig
    FROM results_by_institution_type rbit
    WHERE rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1)
      AND rbit.institution_roles_id = 5               -- ROLE 5 ONLY (A-4). Mutation target for case (c).
  ) x GROUP BY x.rid
) o ON o.rid = c.result_id
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT rim.result_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(rim.unit_of_measure AS CHAR),'<NULL>'), IFNULL(CAST(rim.quantity AS CHAR),'<NULL>'),
             IFNULL(CAST(rim.addressing_demands AS CHAR),'<NULL>')
           ) sig
    FROM result_ip_measure rim
    WHERE rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1)
  ) x GROUP BY x.rid
) m ON m.rid = c.result_id;

INSERT INTO tmp_iu26_sig_p
SELECT c.result_id,                                     -- keyed by the TARGET id, rows read from the PREVIOUS result
       IFNULL(a.n,0), IFNULL(o.n,0), IFNULL(m.n,0),
       IFNULL(a.sigs,''), IFNULL(o.sigs,''), IFNULL(m.sigs,'')
FROM tmp_iu26_cand c
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT ra.result_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(ra.women AS CHAR),'<NULL>'), IFNULL(CAST(ra.women_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.men AS CHAR),'<NULL>'), IFNULL(CAST(ra.men_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.other_actor_type AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.sex_and_age_disaggregation AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.age_disaggregation_not_available AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.youth_split_applied_by_system AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.how_many AS CHAR),'<NULL>'), IFNULL(CAST(ra.count_unit AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.use_nature AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.has_women AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_women_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.has_men AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_men_youth AS CHAR),'<NULL>'),
             IFNULL(CAST(ra.addressing_demands AS CHAR),'<NULL>'), IFNULL(CAST(ra.actor_type_id AS CHAR),'<NULL>')
           ) sig
    FROM result_actors ra
    WHERE ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1)
  ) x GROUP BY x.rid
) a ON a.rid = c.prev_id
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT rbit.results_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(rbit.institution_types_id AS CHAR),'<NULL>'), IFNULL(CAST(rbit.how_many AS CHAR),'<NULL>'),
             IFNULL(CAST(rbit.other_institution AS CHAR),'<NULL>'), IFNULL(CAST(rbit.graduate_students AS CHAR),'<NULL>'),
             IFNULL(CAST(rbit.addressing_demands AS CHAR),'<NULL>')
           ) sig
    FROM results_by_institution_type rbit
    WHERE rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1)
      AND rbit.institution_roles_id = 5               -- ROLE 5 ONLY (A-4). Same clause as the target side.
  ) x GROUP BY x.rid
) o ON o.rid = c.prev_id
LEFT JOIN (
  SELECT x.rid, COUNT(*) n, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs
  FROM (
    SELECT rim.result_id rid,
           CONCAT_WS(CHAR(31),
             IFNULL(CAST(rim.unit_of_measure AS CHAR),'<NULL>'), IFNULL(CAST(rim.quantity AS CHAR),'<NULL>'),
             IFNULL(CAST(rim.addressing_demands AS CHAR),'<NULL>')
           ) sig
    FROM result_ip_measure rim
    WHERE rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1)
  ) x GROUP BY x.rid
) m ON m.rid = c.prev_id;

-- 1-C. Qualifying results: EACH of the three tables equal (empty = empty counts as equal); a result whose
--      three tables are all empty is skipped.
DROP TEMPORARY TABLE IF EXISTS tmp_iu26_qual;
CREATE TEMPORARY TABLE tmp_iu26_qual (
  result_id INT NOT NULL PRIMARY KEY,
  prev_id INT NOT NULL, source VARCHAR(20) NULL, status_id INT NULL,
  a_n INT NOT NULL, o_n INT NOT NULL, m_n INT NOT NULL
);
INSERT INTO tmp_iu26_qual
SELECT c.result_id, c.prev_id, c.source, c.status_id, t.a_n, t.o_n, t.m_n
FROM tmp_iu26_cand c
JOIN tmp_iu26_sig_t t ON t.result_id = c.result_id
JOIN tmp_iu26_sig_p p ON p.result_id = c.result_id
WHERE t.a_n = p.a_n AND CAST(t.a_sigs AS BINARY) = CAST(p.a_sigs AS BINARY)
  AND t.o_n = p.o_n AND CAST(t.o_sigs AS BINARY) = CAST(p.o_sigs AS BINARY)
  AND t.m_n = p.m_n AND CAST(t.m_sigs AS BINARY) = CAST(p.m_sigs AS BINARY)
  AND (t.a_n + t.o_n + t.m_n) > 0;

-- 1-D. Truncation guard. EXPECT max_sig_len well below group_concat_max_len.
SELECT @@group_concat_max_len AS group_concat_max_len,
       (SELECT MAX(GREATEST(LENGTH(a_sigs), LENGTH(o_sigs), LENGTH(m_sigs))) FROM tmp_iu26_sig_t) AS max_sig_len_target,
       (SELECT MAX(GREATEST(LENGTH(a_sigs), LENGTH(o_sigs), LENGTH(m_sigs))) FROM tmp_iu26_sig_p) AS max_sig_len_prev;

-- 1-E. THE DRY-RUN REPORT -------------------------------------------------------------------------------
-- 1a. Context only: ALL 2026 type-2 active results with a previous result, by source and status
--     (shows status 4 and the others being excluded by the predicate; the cutoff is NOT applied here).
SELECT CASE r.source WHEN 'API' THEN 'W3' WHEN 'Result' THEN 'W1/W2' ELSE CONCAT('other:', IFNULL(r.source,'NULL')) END AS source_group,
       r.status_id,
       COUNT(*) AS results_2026_with_previous,
       SUM(r.created_date <= @deploy_cutoff) AS created_on_or_before_cutoff
FROM result r
JOIN version v  ON v.id = r.version_id AND v.is_active = 1
JOIN version pv ON pv.id = v.previous_phase AND pv.is_active = 1
JOIN result pr  ON pr.result_code = r.result_code AND pr.version_id = pv.id AND pr.is_active = 1
WHERE r.result_type_id = 2 AND r.is_active = 1 AND v.phase_year = @phase_year
GROUP BY 1, 2 ORDER BY 1, 2;

-- 1b. Candidates vs QUALIFYING results, per source group.  >>> compare the QUALIFYING total with ~217 (P-19) <<<
SELECT CASE c.source WHEN 'API' THEN 'W3' WHEN 'Result' THEN 'W1/W2' ELSE CONCAT('other:', IFNULL(c.source,'NULL')) END AS source_group,
       c.status_id,
       COUNT(*)        AS candidates,
       COUNT(q.result_id) AS qualifying
FROM tmp_iu26_cand c
LEFT JOIN tmp_iu26_qual q ON q.result_id = c.result_id
GROUP BY 1, 2 WITH ROLLUP;

-- 1c. Why candidates do NOT qualify (explains any difference to ~217).
SELECT SUM(t.a_n + t.o_n + t.m_n = 0 AND p.a_n + p.o_n + p.m_n = 0)                                       AS skipped_all_empty_both_sides,
       SUM(NOT (t.a_n = p.a_n AND CAST(t.a_sigs AS BINARY) = CAST(p.a_sigs AS BINARY)))                                       AS actors_differ,
       SUM(NOT (t.o_n = p.o_n AND CAST(t.o_sigs AS BINARY) = CAST(p.o_sigs AS BINARY)))                                       AS orgs_differ,
       SUM(NOT (t.m_n = p.m_n AND CAST(t.m_sigs AS BINARY) = CAST(p.m_sigs AS BINARY)))                                       AS measures_differ,
       SUM(t.a_n + t.o_n + t.m_n = 0 AND p.a_n + p.o_n + p.m_n > 0)                                         AS target_empty_prev_not
FROM tmp_iu26_cand c
JOIN tmp_iu26_sig_t t ON t.result_id = c.result_id
JOIN tmp_iu26_sig_p p ON p.result_id = c.result_id;

-- 1d. Rows that WOULD be deactivated, per source group (+ ROLLUP total). ONE statement, ONE reference to
--     tmp_iu26_qual (the per-table counts come from derived tables over the BASE tables, joined once each).
SELECT q.source,
       COUNT(*)                         AS qualifying_results,
       SUM(IFNULL(a.n,0))               AS actor_rows,     SUM(a.n IS NOT NULL) AS results_with_actor_rows,
       SUM(IFNULL(o.n,0))               AS org_rows_role5, SUM(o.n IS NOT NULL) AS results_with_org_rows,
       SUM(IFNULL(m.n,0))               AS measure_rows,   SUM(m.n IS NOT NULL) AS results_with_measure_rows
FROM tmp_iu26_qual q
LEFT JOIN (SELECT ra.result_id rid, COUNT(*) n FROM result_actors ra
           WHERE ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1) GROUP BY ra.result_id) a ON a.rid = q.result_id
LEFT JOIN (SELECT rbit.results_id rid, COUNT(*) n FROM results_by_institution_type rbit
           WHERE rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1)
             AND rbit.institution_roles_id = 5 GROUP BY rbit.results_id) o ON o.rid = q.result_id
LEFT JOIN (SELECT rim.result_id rid, COUNT(*) n FROM result_ip_measure rim
           WHERE rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1) GROUP BY rim.result_id) m ON m.rid = q.result_id
GROUP BY q.source WITH ROLLUP;

-- 1d-vars. The same three totals into @variables (the PART 2 recount compares against them automatically).
SELECT SUM(IFNULL(a.n,0)), SUM(IFNULL(o.n,0)), SUM(IFNULL(m.n,0))
  INTO @dry_actors, @dry_orgs, @dry_measures
FROM tmp_iu26_qual q
LEFT JOIN (SELECT ra.result_id rid, COUNT(*) n FROM result_actors ra
           WHERE ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1) GROUP BY ra.result_id) a ON a.rid = q.result_id
LEFT JOIN (SELECT rbit.results_id rid, COUNT(*) n FROM results_by_institution_type rbit
           WHERE rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1)
             AND rbit.institution_roles_id = 5 GROUP BY rbit.results_id) o ON o.rid = q.result_id
LEFT JOIN (SELECT rim.result_id rid, COUNT(*) n FROM result_ip_measure rim
           WHERE rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1) GROUP BY rim.result_id) m ON m.rid = q.result_id;
SELECT @dry_actors AS dry_actor_rows, @dry_orgs AS dry_org_rows, @dry_measures AS dry_measure_rows;

-- 1e. Qualifying results that STILL carry active LEGACY measure rows (never touched, DD-11).
SELECT q.source, COUNT(DISTINCT q.result_id) AS results_with_active_legacy_measures, COUNT(*) AS legacy_rows
FROM tmp_iu26_qual q
JOIN results_innovations_use riu ON riu.results_id = q.result_id AND riu.is_active = 1
JOIN results_innovations_use_measures rium ON rium.result_innovation_use_id = riu.result_innovation_use_id AND rium.is_active = 1
GROUP BY q.source;

-- 1f. Candidates WITHOUT an active results_innovations_use row (InnovUseExists would not return them). Info only.
SELECT COUNT(*) AS candidates_without_active_iu_row
FROM tmp_iu26_cand c
WHERE NOT EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = c.result_id AND riu.is_active = 1);

-- 1g. Sanity: rows of qualifying results that this script will NOT touch (info; ONE reference to tmp_iu26_qual).
SELECT SUM(IFNULL(a.n,0)) AS actors_section2, SUM(IFNULL(o2.n,0)) AS orgs_section2,
       SUM(IFNULL(o5.n,0)) AS orgs_role_not5,  SUM(IFNULL(m.n,0))  AS measures_section2
FROM tmp_iu26_qual q
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_actors WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) a ON a.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND section_id = 2 GROUP BY results_id) o2 ON o2.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND institution_roles_id <> 5 GROUP BY results_id) o5 ON o5.rid = q.result_id
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_ip_measure WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) m ON m.rid = q.result_id;

-- 1h. The list of qualifying result ids (feeds PART 3 and the PRTest spot-check).
SELECT q.result_id, q.prev_id, q.source, q.a_n AS actor_rows, q.o_n AS org_rows, q.m_n AS measure_rows
FROM tmp_iu26_qual q ORDER BY q.result_id;

-- 1-F. SAVE THE REVIEWED LIST (run once, in this same session, right after the report above). This is the only
--      persistent object PART 1 creates. The HITL stop can last days and the TEMPORARY tables will not survive it;
--      PART 2 recomputes the qualifying set and refuses to touch anything that is not IN THIS LIST with the SAME row
--      counts AND the SAME signature hash (SHA2 over the target's actor/org/measure signatures: an edited row changes
--      the hash even when the row count does not), the same @phase_year and the same cutoff.
--      Plain CREATE (no IF NOT EXISTS): a second run fails instead of overwriting the reviewed list.
--      Refuse to save a list built under a truncating GROUP_CONCAT limit: run 1-D first and check it.
CREATE TABLE bkp_iu26_reviewed_YYYYMMDD AS
SELECT q.result_id, q.prev_id, q.source, q.a_n, q.o_n, q.m_n,
       SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256) AS sig_hash,
       @phase_year AS phase_year, @deploy_cutoff AS deploy_cutoff, NOW() AS reviewed_saved_at
FROM tmp_iu26_qual q
JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id;

-- =====================================================================================
-- >>> HITL GATE. STOP HERE. Santiago reviews PART 1 (1-F saved the reviewed list).
-- >>> DISQUALIFIER (P-19): if the QUALIFYING total in 1b differs from ~217 without an explanation that 1c / 1a
-- >>> supports (e.g. results created after the cutoff, edited results), DO NOT RUN PART 2. Never run the UPDATE
-- >>> on an unexplained count: report the numbers instead. Also stop if 0a returned rows or 1-D is near the limit.
-- =====================================================================================


-- =====================================================================================
-- PART 2 -- DESTRUCTIVE. DO NOT RUN until Santiago reviewed the dry run (PART 1) and the count is explained.
--           PROD only after PR-1 is deployed. May be a NEW session/day: the TEMPORARY tables are rebuilt in 2-pre.
-- =====================================================================================

-- PART 2 ORDER (closes the race window instead of detecting it): 2-A params -> 2-0 DDL -> START TRANSACTION ->
-- 2-1b LOCK the reviewed results' rows -> 2-pre rebuild of 1-A..1-C + gate (INSIDE the transaction, so it reads the
-- locked, final data) -> 2-1c.. backup/update -> 2-3 / 2-3b recount + hash re-check -> COMMIT or ROLLBACK.
-- CREATE/DROP TEMPORARY TABLE do not commit implicitly, so rebuilding the temp tables inside the transaction is safe.
-- Rows INSERTED after the lock by other sessions are not locked and stay active by design: they are either
-- caught by the gate (visible at the rebuild) or by the 2-3 counts / 2-3b hash (visible only at 2-1); never silently kept.

-- 2-A. Re-run ALL of PART 0 in THIS session, verbatim: SET @deploy_cutoff (paste EXACTLY the value used for the review,
--      same string, same time zone), SET @phase_year, and SET SESSION group_concat_max_len (a NEW session silently falls
--      back to 1024 bytes and truncates the signatures). The gate in 2-pre fails closed if any of it is wrong.
--      If a previous PART 2 attempt was ROLLED BACK today, first drop the EMPTY backups it left, and only if 0 rows:
--        SELECT COUNT(*) FROM bkp_iu26_actors_YYYYMMDD;  (and _orgs_, _measures_)  -> if all three are 0:
--        DROP TABLE bkp_iu26_actors_YYYYMMDD; DROP TABLE bkp_iu26_orgs_YYYYMMDD; DROP TABLE bkp_iu26_measures_YYYYMMDD;
--      NEVER drop a backup table with rows, and never drop bkp_iu26_reviewed_YYYYMMDD.

-- 2-0. DDL FIRST (implicit commit, so BEFORE START TRANSACTION). Backup tables = full row copies + run stamp.
--      REPLACE YYYYMMDD with the run date in the three names (whole file).
SET @run_at = NOW();
SELECT @run_at AS run_at_note_this_value_for_rollback;

CREATE TABLE bkp_iu26_actors_YYYYMMDD   LIKE result_actors;
CREATE TABLE bkp_iu26_orgs_YYYYMMDD     LIKE results_by_institution_type;
CREATE TABLE bkp_iu26_measures_YYYYMMDD LIKE result_ip_measure;
ALTER TABLE bkp_iu26_actors_YYYYMMDD   ADD COLUMN cleanup_run_at DATETIME NOT NULL;
ALTER TABLE bkp_iu26_orgs_YYYYMMDD     ADD COLUMN cleanup_run_at DATETIME NOT NULL;
ALTER TABLE bkp_iu26_measures_YYYYMMDD ADD COLUMN cleanup_run_at DATETIME NOT NULL;
-- (the backup tables keep the source PRIMARY KEY on purpose: running 2-1 twice fails with a duplicate key
--  instead of silently double-backing-up)

START TRANSACTION;

-- 2-1b. LOCK first. Lock every considered row of the REVIEWED results (persistent list, so no temp table is needed
--       yet). From here until COMMIT/ROLLBACK nobody can edit those rows: whatever the rebuild below reads is final.
--       The result sets are only a lock, ignore them.
SELECT ra.result_actors_id FROM result_actors ra JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = ra.result_id
WHERE ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1) FOR UPDATE;
SELECT rbit.id FROM results_by_institution_type rbit JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = rbit.results_id
WHERE rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1) AND rbit.institution_roles_id = 5 FOR UPDATE;
SELECT rim.result_ip_measure_id FROM result_ip_measure rim JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = rim.result_id
WHERE rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1) FOR UPDATE;

-- 2-pre. REBUILD AND GATE, INSIDE THE TRANSACTION (users may have edited rows during the HITL stop). The gate FAILS CLOSED.
--   (i)  Re-run, verbatim and in order, blocks 1-A, 1-B, 1-C (each starts with DROP TEMPORARY TABLE IF EXISTS, so the temp
--        tables are rebuilt from the CURRENT, now locked, data). Do not run 1-E / 1-F again.
--   (ii) Then run the gate below. Every statement references each temporary table at most once.
--   If gate_ok is not 1: ROLLBACK; (nothing has been changed yet), see the note after the gate.

-- 2-pre-a. Truncation guard (the 1-D check, redone here): longest signature on each side.
SELECT MAX(GREATEST(LENGTH(a_sigs), LENGTH(o_sigs), LENGTH(m_sigs))) INTO @max_sig_t FROM tmp_iu26_sig_t;
SELECT MAX(GREATEST(LENGTH(a_sigs), LENGTH(o_sigs), LENGTH(m_sigs))) INTO @max_sig_p FROM tmp_iu26_sig_p;
SELECT @@session.group_concat_max_len AS group_concat_max_len, @max_sig_t AS max_sig_len_target, @max_sig_p AS max_sig_len_prev;

-- 2-pre-b. Fresh vs reviewed, matching on id + row counts + signature hash.
SELECT COUNT(*) INTO @fresh_not_reviewed
FROM tmp_iu26_qual q
JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id
LEFT JOIN bkp_iu26_reviewed_YYYYMMDD rv
       ON rv.result_id = q.result_id AND rv.a_n = q.a_n AND rv.o_n = q.o_n AND rv.m_n = q.m_n
      AND rv.sig_hash = SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256)
WHERE rv.result_id IS NULL;                         -- qualifying now but not reviewed (or other counts / other hash)

SELECT COUNT(*) INTO @reviewed_not_fresh
FROM bkp_iu26_reviewed_YYYYMMDD rv
LEFT JOIN (
  SELECT q.result_id, q.a_n, q.o_n, q.m_n,
         SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256) AS sig_hash
  FROM tmp_iu26_qual q JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id
) f ON f.result_id = rv.result_id AND f.a_n = rv.a_n AND f.o_n = rv.o_n AND f.m_n = rv.m_n AND f.sig_hash = rv.sig_hash
WHERE f.result_id IS NULL;                          -- reviewed but no longer identical (edited / added / status change)

SELECT COUNT(*) INTO @fresh_total FROM tmp_iu26_qual;
SELECT COUNT(*), SUM(a_n), SUM(o_n), SUM(m_n), MIN(deploy_cutoff), MAX(deploy_cutoff), MIN(phase_year), MAX(phase_year)
  INTO @rev_total, @rev_actors, @rev_orgs, @rev_measures, @rev_cutoff_min, @rev_cutoff_max, @rev_year_min, @rev_year_max
FROM bkp_iu26_reviewed_YYYYMMDD;

-- FAILS CLOSED: any NULL or any missing piece makes @gate_ok <> 1 (IFNULL(..., 0) on every term).
SET @gate_ok = IFNULL(
      (@fresh_not_reviewed = 0 AND @reviewed_not_fresh = 0
   AND @fresh_total = @rev_total AND @rev_total > 0
   AND @rev_cutoff_min = @rev_cutoff_max AND @deploy_cutoff = @rev_cutoff_min
   AND @rev_year_min = @rev_year_max AND @phase_year = @rev_year_min
   AND @@session.group_concat_max_len >= 67108864                      -- the SET of PART 0 was re-run in THIS session
   AND @max_sig_t IS NOT NULL AND @max_sig_p IS NOT NULL
   AND GREATEST(@max_sig_t, @max_sig_p) < 0.9 * @@session.group_concat_max_len),   -- no signature near the limit: no truncation
   0);
SELECT @gate_ok AS gate_ok, @fresh_not_reviewed AS fresh_not_reviewed, @reviewed_not_fresh AS reviewed_not_fresh,
       @fresh_total AS fresh_total, @rev_total AS reviewed_total, @rev_actors AS reviewed_actor_rows,
       @rev_orgs AS reviewed_org_rows, @rev_measures AS reviewed_measure_rows,
       @@session.group_concat_max_len AS group_concat_max_len, @phase_year AS phase_year_now, @rev_year_min AS phase_year_reviewed;
-- >>> If gate_ok is not 1: ROLLBACK; and STOP. Do NOT run 2-1c onward. Find which results changed (they were edited during the
-- >>> stop: leaving them alone is the correct outcome) and redo the review with a new reviewed list.
-- >>> Defence in depth: the 2-1 backups ALSO join the reviewed list (id, counts, hash) and carry `@gate_ok = 1`, so with
-- >>> a failed gate nothing is backed up and nothing is deactivated, even if someone runs on by mistake.

-- 2-1c. BEFORE snapshot of the rows this script must NOT touch (compare with the AFTER snapshot in 2-4: identical;
--       it is an extra sanity check for section-2 / non-role-5 rows, NOT what protects edited value rows: the lock
--       2-1b, the 2-pre hash gate and 2-3b do).
SELECT 'BEFORE' AS snapshot, SUM(IFNULL(a.n,0)) AS actors_section2, SUM(IFNULL(o2.n,0)) AS orgs_section2,
       SUM(IFNULL(o5.n,0)) AS orgs_role_not5, SUM(IFNULL(m.n,0)) AS measures_section2
FROM tmp_iu26_qual q
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_actors WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) a ON a.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND section_id = 2 GROUP BY results_id) o2 ON o2.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND institution_roles_id <> 5 GROUP BY results_id) o5 ON o5.rid = q.result_id
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_ip_measure WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) m ON m.rid = q.result_id;

-- 2-1. Backup: exactly the rows the UPDATE will touch (same predicate as 1d), of results in BOTH the fresh set and
--      the reviewed list with identical row counts AND signature hash, and only if the 2-pre gate passed.
INSERT INTO bkp_iu26_actors_YYYYMMDD
SELECT ra.*, @run_at
FROM result_actors ra
JOIN tmp_iu26_qual q ON q.result_id = ra.result_id
JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id
JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = q.result_id AND rv.a_n = q.a_n AND rv.o_n = q.o_n AND rv.m_n = q.m_n
     AND rv.sig_hash = SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256)
WHERE @gate_ok = 1 AND ra.is_active = 1 AND (ra.section_id IS NULL OR ra.section_id = 1);

INSERT INTO bkp_iu26_orgs_YYYYMMDD
SELECT rbit.*, @run_at
FROM results_by_institution_type rbit
JOIN tmp_iu26_qual q ON q.result_id = rbit.results_id
JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id
JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = q.result_id AND rv.a_n = q.a_n AND rv.o_n = q.o_n AND rv.m_n = q.m_n
     AND rv.sig_hash = SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256)
WHERE @gate_ok = 1 AND rbit.is_active = 1 AND (rbit.section_id IS NULL OR rbit.section_id = 1)
  AND rbit.institution_roles_id = 5;                      -- ROLE 5 ONLY

INSERT INTO bkp_iu26_measures_YYYYMMDD
SELECT rim.*, @run_at
FROM result_ip_measure rim
JOIN tmp_iu26_qual q ON q.result_id = rim.result_id
JOIN tmp_iu26_sig_t t ON t.result_id = q.result_id
JOIN bkp_iu26_reviewed_YYYYMMDD rv ON rv.result_id = q.result_id AND rv.a_n = q.a_n AND rv.o_n = q.o_n AND rv.m_n = q.m_n
     AND rv.sig_hash = SHA2(CONCAT(t.a_sigs, '#|#|#', t.o_sigs, '#|#|#', t.m_sigs), 256)
WHERE @gate_ok = 1 AND rim.is_active = 1 AND (rim.section_id IS NULL OR rim.section_id = 1);

-- 2-2. Soft delete: exactly the backed-up ids of THIS run. The legacy measures table is not touched (DD-11).
UPDATE result_actors ra
JOIN bkp_iu26_actors_YYYYMMDD b ON b.result_actors_id = ra.result_actors_id AND b.cleanup_run_at = @run_at
SET ra.is_active = 0
WHERE ra.is_active = 1;

UPDATE results_by_institution_type rbit
JOIN bkp_iu26_orgs_YYYYMMDD b ON b.id = rbit.id AND b.cleanup_run_at = @run_at
SET rbit.is_active = 0
WHERE rbit.is_active = 1 AND rbit.institution_roles_id = 5;

UPDATE result_ip_measure rim
JOIN bkp_iu26_measures_YYYYMMDD b ON b.result_ip_measure_id = rim.result_ip_measure_id AND b.cleanup_run_at = @run_at
SET rim.is_active = 0
WHERE rim.is_active = 1;

-- 2-3. RECOUNT (inside the transaction, before COMMIT). `expected` = the REVIEWED dry-run totals (@rev_*, from the
--      reviewed list). status must be OK on all three rows: backed_up = expected, deactivated = backed_up, still_active = 0.
--      Any MISMATCH -> ROLLBACK. (Only persistent tables appear here, so repeated references are fine.)
SELECT t.tbl, t.expected, t.backed_up, t.deactivated, t.still_active,
       IF(t.backed_up = t.expected AND t.deactivated = t.backed_up AND t.still_active = 0, 'OK', 'MISMATCH -> ROLLBACK') AS status
FROM (
  SELECT 'result_actors' AS tbl, @rev_actors AS expected,
         (SELECT COUNT(*) FROM bkp_iu26_actors_YYYYMMDD WHERE cleanup_run_at = @run_at) AS backed_up,
         (SELECT COUNT(*) FROM result_actors ra JOIN bkp_iu26_actors_YYYYMMDD b ON b.result_actors_id = ra.result_actors_id AND b.cleanup_run_at = @run_at WHERE ra.is_active = 0) AS deactivated,
         (SELECT COUNT(*) FROM result_actors ra JOIN bkp_iu26_actors_YYYYMMDD b ON b.result_actors_id = ra.result_actors_id AND b.cleanup_run_at = @run_at WHERE ra.is_active = 1) AS still_active
  UNION ALL
  SELECT 'results_by_institution_type', @rev_orgs,
         (SELECT COUNT(*) FROM bkp_iu26_orgs_YYYYMMDD WHERE cleanup_run_at = @run_at),
         (SELECT COUNT(*) FROM results_by_institution_type r JOIN bkp_iu26_orgs_YYYYMMDD b ON b.id = r.id AND b.cleanup_run_at = @run_at WHERE r.is_active = 0),
         (SELECT COUNT(*) FROM results_by_institution_type r JOIN bkp_iu26_orgs_YYYYMMDD b ON b.id = r.id AND b.cleanup_run_at = @run_at WHERE r.is_active = 1)
  UNION ALL
  SELECT 'result_ip_measure', @rev_measures,
         (SELECT COUNT(*) FROM bkp_iu26_measures_YYYYMMDD WHERE cleanup_run_at = @run_at),
         (SELECT COUNT(*) FROM result_ip_measure r JOIN bkp_iu26_measures_YYYYMMDD b ON b.result_ip_measure_id = r.result_ip_measure_id AND b.cleanup_run_at = @run_at WHERE r.is_active = 0),
         (SELECT COUNT(*) FROM result_ip_measure r JOIN bkp_iu26_measures_YYYYMMDD b ON b.result_ip_measure_id = r.result_ip_measure_id AND b.cleanup_run_at = @run_at WHERE r.is_active = 1)
) t;

-- 2-3b. HASH RE-CHECK from the backup rows themselves (belt and braces, inside the transaction, before COMMIT).
--       Rebuilds each reviewed result's signature from THIS run's backup rows (cleanup_run_at = @run_at) with the same
--       recipe as 1-B (same columns, same order, ORDER BY CAST(sig AS BINARY), '#|#' separator, IFNULL(...,'') for an empty
--       table) and compares its SHA2 with the reviewed sig_hash. mismatches AND missing must both be 0; anything else ->
--       ROLLBACK. This catches a value-only edit that slipped in anywhere before the lock (persistent tables only).
SELECT COUNT(*) AS reviewed_results,
       SUM(h.calc_hash IS NULL)               AS missing,
       SUM(h.calc_hash <> h.sig_hash)         AS mismatches,
       IF(SUM(h.calc_hash IS NULL) = 0 AND SUM(h.calc_hash <> h.sig_hash) = 0, 'OK', 'MISMATCH -> ROLLBACK') AS status
FROM (
  SELECT rv.result_id, rv.sig_hash,
         IF(a.sigs IS NULL AND o.sigs IS NULL AND m.sigs IS NULL, NULL,
            SHA2(CONCAT(IFNULL(a.sigs,''), '#|#|#', IFNULL(o.sigs,''), '#|#|#', IFNULL(m.sigs,'')), 256)) AS calc_hash
  FROM bkp_iu26_reviewed_YYYYMMDD rv
  LEFT JOIN (SELECT x.rid, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs FROM (
               SELECT ra.result_id rid, CONCAT_WS(CHAR(31),
                 IFNULL(CAST(ra.women AS CHAR),'<NULL>'), IFNULL(CAST(ra.women_youth AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.men AS CHAR),'<NULL>'), IFNULL(CAST(ra.men_youth AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.other_actor_type AS CHAR),'<NULL>'), IFNULL(CAST(ra.sex_and_age_disaggregation AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.age_disaggregation_not_available AS CHAR),'<NULL>'), IFNULL(CAST(ra.youth_split_applied_by_system AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.how_many AS CHAR),'<NULL>'), IFNULL(CAST(ra.count_unit AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.use_nature AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_women AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.has_women_youth AS CHAR),'<NULL>'), IFNULL(CAST(ra.has_men AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.has_men_youth AS CHAR),'<NULL>'), IFNULL(CAST(ra.addressing_demands AS CHAR),'<NULL>'),
                 IFNULL(CAST(ra.actor_type_id AS CHAR),'<NULL>')) sig
               FROM bkp_iu26_actors_YYYYMMDD ra WHERE ra.cleanup_run_at = @run_at) x GROUP BY x.rid) a ON a.rid = rv.result_id
  LEFT JOIN (SELECT x.rid, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs FROM (
               SELECT rbit.results_id rid, CONCAT_WS(CHAR(31),
                 IFNULL(CAST(rbit.institution_types_id AS CHAR),'<NULL>'), IFNULL(CAST(rbit.how_many AS CHAR),'<NULL>'),
                 IFNULL(CAST(rbit.other_institution AS CHAR),'<NULL>'), IFNULL(CAST(rbit.graduate_students AS CHAR),'<NULL>'),
                 IFNULL(CAST(rbit.addressing_demands AS CHAR),'<NULL>')) sig
               FROM bkp_iu26_orgs_YYYYMMDD rbit WHERE rbit.cleanup_run_at = @run_at) x GROUP BY x.rid) o ON o.rid = rv.result_id
  LEFT JOIN (SELECT x.rid, GROUP_CONCAT(x.sig ORDER BY CAST(x.sig AS BINARY) SEPARATOR '#|#') sigs FROM (
               SELECT rim.result_id rid, CONCAT_WS(CHAR(31),
                 IFNULL(CAST(rim.unit_of_measure AS CHAR),'<NULL>'), IFNULL(CAST(rim.quantity AS CHAR),'<NULL>'),
                 IFNULL(CAST(rim.addressing_demands AS CHAR),'<NULL>')) sig
               FROM bkp_iu26_measures_YYYYMMDD rim WHERE rim.cleanup_run_at = @run_at) x GROUP BY x.rid) m ON m.rid = rv.result_id
) h;

-- 2-4. Untouched-data check (inside the transaction): section-2 rows and non-role-5 rows of the qualifying
--      results are still active. AFTER snapshot: MUST equal the BEFORE snapshot of 2-1c (same transaction, rows
--      locked); it may differ from the dry-run 1g, which was taken earlier. ONE reference to tmp_iu26_qual.
SELECT 'AFTER' AS snapshot, SUM(IFNULL(a.n,0)) AS actors_section2, SUM(IFNULL(o2.n,0)) AS orgs_section2,
       SUM(IFNULL(o5.n,0)) AS orgs_role_not5,  SUM(IFNULL(m.n,0))  AS measures_section2
FROM tmp_iu26_qual q
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_actors WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) a ON a.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND section_id = 2 GROUP BY results_id) o2 ON o2.rid = q.result_id
LEFT JOIN (SELECT results_id rid, COUNT(*) n FROM results_by_institution_type WHERE is_active = 1 AND institution_roles_id <> 5 GROUP BY results_id) o5 ON o5.rid = q.result_id
LEFT JOIN (SELECT result_id rid, COUNT(*) n FROM result_ip_measure WHERE is_active = 1 AND section_id = 2 GROUP BY result_id) m ON m.rid = q.result_id;

-- Decision point. COMMIT only if ALL hold: 2-3 status OK on 3 rows, 2-3b status OK, 2-4 AFTER = 2-1c BEFORE. Otherwise: ROLLBACK.
-- (Previously: if every number is as expected: COMMIT.) Otherwise: ROLLBACK (the backups made inside the
-- transaction roll back too; the three empty backup tables from 2-0 stay and can be dropped).
-- COMMIT;
-- ROLLBACK;

-- 2-5. FRESH-TAB VERIFICATION. After COMMIT, open a NEW tab/session (DBeaver: new SQL editor) and run:
-- SELECT COUNT(*) AS still_active_actors   FROM result_actors ra JOIN bkp_iu26_actors_YYYYMMDD b ON b.result_actors_id = ra.result_actors_id WHERE ra.is_active = 1;           -- expect 0
-- SELECT COUNT(*) AS still_active_orgs     FROM results_by_institution_type r JOIN bkp_iu26_orgs_YYYYMMDD b ON b.id = r.id WHERE r.is_active = 1;                              -- expect 0
-- SELECT COUNT(*) AS still_active_measures FROM result_ip_measure r JOIN bkp_iu26_measures_YYYYMMDD b ON b.result_ip_measure_id = r.result_ip_measure_id WHERE r.is_active = 1; -- expect 0
-- SELECT (SELECT COUNT(*) FROM bkp_iu26_actors_YYYYMMDD) a, (SELECT COUNT(*) FROM bkp_iu26_orgs_YYYYMMDD) o, (SELECT COUNT(*) FROM bkp_iu26_measures_YYYYMMDD) m;               -- = the 1d counts


-- =====================================================================================
-- PART 3 -- Re-validation of each cleaned result (design 5.5 "Green checks / validation")
-- =====================================================================================
-- MECHANISM FOUND (server code):
--  * The P25 section validation is NOT stored. `GET /v2/api/results/results-validation/get/green-checks/:resultId`
--    (mount path `results-validation`: api/results/results.routes.ts:136-139; handler `findAllV2`, controller
--    results-validation-module.controller.ts:24-30) calls `ResultsValidationModuleService.calculateValidationSections`
--    (results-validation-module.service.ts:26) -> `resultValidationRepository.validateResultById` (repository.ts:32-116)
--    -> `CALL validate_sections_mapped_batch(<id>, '<sections json>')` (migrations/1762528725798-createValidtionP25.ts:5),
--    which runs, for type 2, the SQL function `validation_innovation_use_P25(resultId)` (same migration :845-847).
--    It reads result_actors / results_by_institution_type / result_ip_measure with `is_active = TRUE AND section_id = 1`
--    (same migration :922-930, :968, :996), so the soft delete takes effect on the next read: nothing stale to
--    refresh for P25 results.
--  * The legacy stored table `validation` is written only by `PATCH .../results-validation/save/green-checks/:resultId`
--    (controller :32-35 -> `saveGreenCheck`, service.ts:275), the P22-era path. UNVERIFIED whether the 2026 client
--    still calls it for P25 results; if it does, the manual step below refreshes it.
--
-- 3-a. SQL: recompute the stored function for each cleaned result (read-only; P25 portfolio only).
--      Informational: 0 = section incomplete (expected for results whose only rows were cleaned); a 1 is not an error
--      by itself (the function has other conditions), but investigate if MANY are 1.
SELECT q.result_id, validation_innovation_use_P25(q.result_id) AS innovation_use_section_valid
FROM tmp_iu26_qual q ORDER BY q.result_id;

-- 3-b. MANUAL STEP (API, not SQL; only if the 2026 client still uses the stored `validation` table -- UNVERIFIED).
--      For each id returned by 1h, with a valid `auth` header (never paste the token in a ticket or log):
--        PATCH <api-base>/api/results/results-validation/save/green-checks/<result_id>
--      Spot-check 3 W1/W2 and 3 W3 ids in the UI after COMMIT: the Innovation Use section shows as incomplete.


-- =====================================================================================
-- ROLLBACK (after COMMIT). Restores EXACTLY the rows of one run. Replace the run timestamp with the value printed
-- by 2-0 (`run_at_note_this_value_for_rollback`). Commented on purpose.
-- =====================================================================================
-- START TRANSACTION;
-- UPDATE result_actors ra JOIN bkp_iu26_actors_YYYYMMDD b ON b.result_actors_id = ra.result_actors_id
--   SET ra.is_active = 1 WHERE b.cleanup_run_at = '<RUN_AT>';
-- UPDATE results_by_institution_type r JOIN bkp_iu26_orgs_YYYYMMDD b ON b.id = r.id
--   SET r.is_active = 1 WHERE b.cleanup_run_at = '<RUN_AT>';
-- UPDATE result_ip_measure r JOIN bkp_iu26_measures_YYYYMMDD b ON b.result_ip_measure_id = r.result_ip_measure_id
--   SET r.is_active = 1 WHERE b.cleanup_run_at = '<RUN_AT>';
-- -- verify counts against the backup tables, then:
-- -- COMMIT;


-- =====================================================================================
-- FALSIFIER CHECKLIST -- run by Santiago on TEST/PRTest (never PROD), BEFORE PROD. Commented on purpose.
-- Goal: PART 1 (dry run) must select NONE of these 5 seeded cases. Seed on PRTest with phase-changed 2026 copies
-- of 5 different type-2 results (each currently qualifying), then run PART 0 + PART 1 (+ PART 2 on TEST for the
-- backup-table checks), and fill the ids below.
--
-- SEED (TEST only; choose 5 distinct qualifying results; @a..@e = their 2026 result ids):
--  (a) edited actor     : UPDATE result_actors SET how_many = how_many + 1 WHERE result_id = @a AND is_active = 1 LIMIT 1;
--  (b) status 4         : UPDATE result SET status_id = 4 WHERE id = @b;
--  (c) role-2 partners  : on @c keep role-5 rows equal to the origin and make sure it has >= 1 active row with
--                         institution_roles_id = 2 (insert one if needed); ALSO ensure @c has >= 1 other considered
--                         row so it qualifies on its own (the case proves the ROLE-2 ROWS are not backed up).
--  (d) section-2 rows   : on @d make sure it has active actor/org/measure rows with section_id = 2 (the 2030 table).
--  (e) created after    : UPDATE result SET created_date = DATE_ADD(@deploy_cutoff, INTERVAL 1 HOUR) WHERE id = @e;
--  SET @a = ..., @b = ..., @c = ..., @d = ..., @e = ...;
--
-- CHECKS after PART 1 (tmp_iu26_qual exists):
--  (a) SELECT COUNT(*) FROM tmp_iu26_qual WHERE result_id = @a;                                  -- expect 0
--  (b) SELECT COUNT(*) FROM tmp_iu26_qual WHERE result_id = @b;                                  -- expect 0 (also not in tmp_iu26_cand)
--  (e) SELECT COUNT(*) FROM tmp_iu26_qual WHERE result_id = @e;                                  -- expect 0
--  (c) after PART 2-1 on TEST: SELECT COUNT(*) FROM bkp_iu26_orgs_YYYYMMDD WHERE institution_roles_id <> 5;   -- expect 0
--      and SELECT COUNT(*) FROM results_by_institution_type WHERE results_id = @c AND institution_roles_id = 2 AND is_active = 1;  -- unchanged
--  (d) after PART 2-1 on TEST: SELECT (SELECT COUNT(*) FROM bkp_iu26_actors_YYYYMMDD WHERE section_id = 2)
--                                   + (SELECT COUNT(*) FROM bkp_iu26_orgs_YYYYMMDD WHERE section_id = 2)
--                                   + (SELECT COUNT(*) FROM bkp_iu26_measures_YYYYMMDD WHERE section_id = 2);                  -- expect 0
--      and the 2030 rows of @d still is_active = 1 after the UPDATE.
--  (f) HITL-gap check (TEST): after 1-F, edit one actor of a reviewed result (UPDATE result_actors SET how_many = how_many + 1 ...),
--      re-run 1-A..1-C, then 2-pre: expect gate_ok = 0, reviewed_not_fresh >= 1, and 2-1 backs up 0 rows.
--      Mutation: remove `@gate_ok = 1` and the reviewed-list join from 2-1 -> that result is backed up and deactivated (red).
--  (g) Fail-closed gate (TEST): open a NEW session, skip the SET SESSION group_concat_max_len, re-run 1-A..1-C and 2-pre:
--      expect gate_ok = 0 (group_concat_max_len = 1024 < 67108864). Also: change @deploy_cutoff or @phase_year -> gate_ok = 0.
--      With an actor result of >= 10 rows edited AFTER the 1024-byte cut: with the SET -> hash differs -> gate_ok = 0.
--      Mutation: drop the `@@session.group_concat_max_len >= ...` and hash terms from @gate_ok -> that case passes (red).
--  (h) Value edit under the lock (TEST): run 2-A, 2-0, START TRANSACTION, 2-1b in tab 1; in tab 2 try
--      UPDATE result_actors SET how_many = how_many + 1 WHERE result_id = @a AND is_active = 1 LIMIT 1;  -> it BLOCKS (lock).
--      To exercise 2-3b itself: ROLLBACK, edit the value BEFORE 2-1b but AFTER 1-F, rerun: gate_ok = 0 (hash). Then
--      temporarily weaken the gate (drop the sig_hash terms of 2-pre-b and of the 2-1 joins) and run to 2-3b: expect
--      status MISMATCH (mismatches >= 1). Mutation: drop 2-3b entirely -> that run reaches COMMIT with the edited row gone (red).
--  Positive control: at least one untouched, qualifying result exists in tmp_iu26_qual (otherwise the zeros above prove nothing).
--
-- MUTATIONS (each must turn a check red; restore after):
--  * Drop the `institution_roles_id = 5` clause (it appears in sig_t, sig_p, the 1d/1g queries, 2-1 and 2-2):
--    check (c) goes red: bkp_iu26_orgs_* then holds role-2 rows (<> 5 count > 0), and a seeded role-2 difference
--    flips @c's qualification.
--  * Drop `(section_id IS NULL OR section_id = 1)` -> `section_id = 1` only is a different bug; instead drop the
--    whole section clause: check (d) goes red (section_id = 2 rows land in the backups).
--  * Drop `AND r.created_date <= @deploy_cutoff` in 1-A: check (e) goes red.
--  * Drop `AND r.status_id = 1` in 1-A: check (b) goes red.
--  * Make the multiset compare ignore one column (e.g. remove ra.how_many from both signatures): check (a) goes red.
-- =====================================================================================
