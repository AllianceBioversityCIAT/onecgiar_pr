# Backfill PROD: anchor the unanchored contribution rows

Spec `bugfix/contribution-target-anchor` · T-2 · CTA-R-3 / CTA-S-5 · CTA-DD-7.
Environment: **PROD** (MySQL 8). Written by an agent, **never executed by an agent**. The user runs it.
Do not paste tokens or credentials anywhere near this script (`.cursorrules`).

## Rule being applied (same as the T-1 server code)

`resolveTargetIdentity` step 4 (`results-toc-results.repository.ts:2846-2857`): count the indicator's catalog
metas whose year equals the result's phase year; **exactly one** gives that meta's `toc_indicator_target_id`;
two or more is ambiguous and is left alone (`:2858-2865`); zero stays NULL. The count is by year match, never
by list length (CTA-DD-3), because the catalog read falls back to all years when the phase year has none
(`:2690-2707`). The catalog join (`:2667-2672`) and the year parser (`:2675-2682`) are copied below.

Counting note: the server counts the joined rows with `COUNT(*)` semantics, and so does this script.

## Order of execution

1. Run block 1 (and optionally 6 and 7). **Stop and review the numbers.**
2. Run blocks 2 + 3 together in ONE session (the `@variables` and the open transaction must survive). Do **NOT**
   include block 4 in that run: `COMMIT;` must never fire before you have read the `decision` line of block 3.
3. Read the `decision` line. Only if it says `OK`, run block 4 (`COMMIT;`) in the same session, and nowhere else.
   Otherwise run `ROLLBACK;` in that same session instead. Block 4 is the only place `COMMIT` is run.
4. Open a **new tab** and run block 5 (verification).

Reminder (INC-167721 lesson): a commented `COMMIT` loses the batch. The `COMMIT;` below is active; after
running it, confirm from the fresh tab in block 5.

---

## Block 1. PROD · read-only · Preview of candidate rows

Scope: active `result_indicators_targets` row, `toc_indicator_target_id IS NULL`, contribution not null,
result phase year 2026. The parent chain is also required to be active (`results_toc_result_indicators`,
`results_toc_result`, `result`), as the live read does (`results-toc-results.repository.ts:495-501`, `:514-516`).
If the total differs from the 58 rows quoted in the spec, that is the reason to look at, not to ignore.

```sql
-- PROD · read-only
SELECT
  r.result_code,
  rs.status_name                AS result_status,
  rit.indicators_targets        AS rit_id,
  rtri.toc_results_indicator_id AS indicator_node,
  rtr.initiative_id,
  ci.official_code              AS initiative_code,
  rit.contributing_indicator,
  v.phase_year,
  COALESCE(m.meta_count, 0)     AS meta_count,
  CASE WHEN m.meta_count = 1 THEN m.only_anchor END AS resolved_anchor,
  CASE
    WHEN COALESCE(m.meta_count, 0) = 0 THEN 'NO_META'
    WHEN m.meta_count = 1 THEN 'WILL_UPDATE'
    ELSE 'AMBIGUOUS'
  END                           AS action
FROM result_indicators_targets rit
JOIN results_toc_result_indicators rtri
  ON rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
 AND rtri.is_active = 1
JOIN results_toc_result rtr
  ON rtr.result_toc_result_id = rtri.results_toc_results_id
 AND rtr.is_active = 1
JOIN result r
  ON r.id = rtr.results_id
 AND r.is_active = 1
JOIN version v
  ON v.id = r.version_id
LEFT JOIN result_status rs
  ON rs.result_status_id = r.status_id
LEFT JOIN clarisa_initiatives ci
  ON ci.id = rtr.initiative_id
LEFT JOIN (
  SELECT
    x.node_id,
    x.meta_year,
    COUNT(*)                          AS meta_count,
    MIN(x.toc_indicator_target_id)    AS only_anchor
  FROM (
    SELECT
      CONVERT(tri.related_node_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AS node_id,
      trit.toc_indicator_target_id,
      CASE
        WHEN trit.target_date REGEXP '^[0-9]{4}-' THEN CAST(LEFT(trit.target_date, 4) AS UNSIGNED)
        WHEN trit.target_date REGEXP '^[0-9]{4}$' THEN CAST(trit.target_date AS SIGNED)
        ELSE NULL
      END AS meta_year
    FROM Integration_information.toc_results_indicators tri
    JOIN Integration_information.toc_result_indicator_target trit
      ON trit.id_indicator = tri.id
     AND CONVERT(trit.toc_result_indicator_id USING utf8mb4)
       = CONVERT(tri.related_node_id USING utf8mb4)
  ) x
  GROUP BY x.node_id, x.meta_year
) m
  ON m.node_id = CONVERT(rtri.toc_results_indicator_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
 AND m.meta_year = v.phase_year
WHERE rit.is_active = 1
  AND rit.toc_indicator_target_id IS NULL
  AND rit.contributing_indicator IS NOT NULL
  AND v.phase_year = 2026
ORDER BY action, r.result_code, rit.indicators_targets;
```

Summary counts to note before going on (same query wrapped; paste block 1 as the inner SELECT if wanted):
the number of `WILL_UPDATE`, `AMBIGUOUS` and `NO_META` rows. Write them down: they are the expected values later.

---

## Block 2. PROD · write · Backup table (exactly the rows of block 1)

`CREATE TABLE` is DDL and commits implicitly in MySQL; that is why it runs before `START TRANSACTION`.
If `bkp_rit_anchor_20261112` already exists the statement fails, which is the safe outcome: stop and look.

```sql
-- PROD · write
SET @admin_user_id = NULL; -- fill in: the user's admin id (NOT known to the agent). While NULL the UPDATE affects 0 rows.

CREATE TABLE bkp_rit_anchor_20261112 AS
SELECT
  rit.indicators_targets,
  rit.result_toc_result_indicator_id,
  rit.number_target,
  rit.contributing_indicator,
  rit.target_date,
  rit.toc_indicator_target_id    AS old_toc_indicator_target_id,
  rit.is_active,
  rit.last_updated_date          AS old_last_updated_date,
  rit.last_updated_by            AS old_last_updated_by,
  r.id                           AS result_id,
  r.result_code,
  rtri.toc_results_indicator_id  AS indicator_node,
  v.phase_year,
  COALESCE(m.meta_count, 0)      AS meta_count,
  CASE WHEN m.meta_count = 1 THEN m.only_anchor END AS resolved_anchor
FROM result_indicators_targets rit
JOIN results_toc_result_indicators rtri
  ON rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
 AND rtri.is_active = 1
JOIN results_toc_result rtr
  ON rtr.result_toc_result_id = rtri.results_toc_results_id
 AND rtr.is_active = 1
JOIN result r
  ON r.id = rtr.results_id
 AND r.is_active = 1
JOIN version v
  ON v.id = r.version_id
LEFT JOIN (
  SELECT
    x.node_id,
    x.meta_year,
    COUNT(*)                          AS meta_count,
    MIN(x.toc_indicator_target_id)    AS only_anchor
  FROM (
    SELECT
      CONVERT(tri.related_node_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AS node_id,
      trit.toc_indicator_target_id,
      CASE
        WHEN trit.target_date REGEXP '^[0-9]{4}-' THEN CAST(LEFT(trit.target_date, 4) AS UNSIGNED)
        WHEN trit.target_date REGEXP '^[0-9]{4}$' THEN CAST(trit.target_date AS SIGNED)
        ELSE NULL
      END AS meta_year
    FROM Integration_information.toc_results_indicators tri
    JOIN Integration_information.toc_result_indicator_target trit
      ON trit.id_indicator = tri.id
     AND CONVERT(trit.toc_result_indicator_id USING utf8mb4)
       = CONVERT(tri.related_node_id USING utf8mb4)
  ) x
  GROUP BY x.node_id, x.meta_year
) m
  ON m.node_id = CONVERT(rtri.toc_results_indicator_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
 AND m.meta_year = v.phase_year
WHERE rit.is_active = 1
  AND rit.toc_indicator_target_id IS NULL
  AND rit.contributing_indicator IS NOT NULL
  AND v.phase_year = 2026;

-- Backup sanity: must equal the block 1 row count.
SELECT COUNT(*) AS backup_rows,
       SUM(meta_count = 1 AND resolved_anchor IS NOT NULL) AS to_update,
       SUM(meta_count > 1)  AS ambiguous,
       SUM(meta_count = 0)  AS no_meta
FROM bkp_rit_anchor_20261112;
```

## Block 3. PROD · write · UPDATE inside a transaction, with the affected-rows check

Only rows whose indicator has exactly one phase-year meta (and that meta has an id) are touched. The
UPDATE is joined to the backup set, still requires the anchor to be NULL, and does nothing while
`@admin_user_id` is NULL (the guard makes it affect 0 rows, and then the check below says `MISMATCH`).

```sql
-- PROD · write
SELECT COUNT(*) INTO @expected
FROM bkp_rit_anchor_20261112
WHERE meta_count = 1 AND resolved_anchor IS NOT NULL;

START TRANSACTION;

UPDATE result_indicators_targets rit
JOIN bkp_rit_anchor_20261112 b
  ON b.indicators_targets = rit.indicators_targets
SET rit.toc_indicator_target_id = b.resolved_anchor,
    rit.last_updated_date       = NOW(),
    rit.last_updated_by         = @admin_user_id
WHERE b.meta_count = 1
  AND b.resolved_anchor IS NOT NULL
  AND rit.toc_indicator_target_id IS NULL
  AND rit.is_active = 1
  AND @admin_user_id IS NOT NULL;

SELECT ROW_COUNT() INTO @affected;   -- must be the very next statement after the UPDATE

SELECT @expected AS expected_rows,
       @affected AS affected_rows,
       IF(@admin_user_id IS NOT NULL AND @affected = @expected AND @affected > 0,
          'OK -> run block 4 (COMMIT)',
          'MISMATCH -> run ROLLBACK; do NOT commit') AS decision;
```

**Disqualifier:** if `affected_rows` is not equal to `expected_rows` (the count of `meta_count = 1` rows from
block 1), or `@admin_user_id` is still NULL, run `ROLLBACK;`, do not COMMIT, and report. A passing exit code
is not evidence here; only the equality is.

## Block 4. PROD · write · Commit

Run only after `decision` says OK. The affected-rows check lives at the end of block 3.

```sql
-- PROD · write
-- Run ONLY after block 3 printed decision = OK, in the same session as blocks 2 + 3. Never as part of a multi-block run.
COMMIT;
```

If the decision was MISMATCH, run this instead and stop:

```sql
-- PROD · write
ROLLBACK;
```

---

## Block 6. PROD · read-only · Ambiguous rows (manual decision)

Rows with two or more phase-year metas. They are never in the UPDATE set (the UPDATE requires `meta_count = 1`).
Runs standalone (does not need the backup table), so it can be used at review time too.
The candidate list shows each meta's `toc_indicator_target_id`, target value and date. The ToC catalog tables
carry no centre column, but the centre lives on the result side: `results_center` (`center_id` such as CENTER-xx,
`is_primary`, `is_leading_result`, `is_active`; entity `results-centers/entities/results-center.entity.ts:14-57`).
The `centres` column lists the result's active centres, primary first (`*` marks the primary one, `L` the
leading one). The initiative (`official_code`) is kept as extra owning context.

```sql
-- PROD · read-only
SELECT
  r.result_code,
  rs.status_name                AS result_status,
  rit.indicators_targets        AS rit_id,
  rtri.toc_results_indicator_id AS indicator_node,
  rtr.initiative_id,
  ci.official_code              AS initiative_code,
  rc.centres,
  rit.contributing_indicator,
  v.phase_year,
  m.meta_count,
  m.candidates
FROM result_indicators_targets rit
JOIN results_toc_result_indicators rtri
  ON rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
 AND rtri.is_active = 1
JOIN results_toc_result rtr
  ON rtr.result_toc_result_id = rtri.results_toc_results_id
 AND rtr.is_active = 1
JOIN result r
  ON r.id = rtr.results_id
 AND r.is_active = 1
JOIN version v
  ON v.id = r.version_id
LEFT JOIN result_status rs
  ON rs.result_status_id = r.status_id
LEFT JOIN clarisa_initiatives ci
  ON ci.id = rtr.initiative_id
LEFT JOIN (
  SELECT
    c.result_id,
    GROUP_CONCAT(
      CONCAT(c.center_id,
             IF(c.is_primary = 1, '*', ''),
             IF(c.is_leading_result = 1, 'L', ''))
      ORDER BY c.is_primary DESC, c.center_id SEPARATOR ', ') AS centres
  FROM results_center c
  WHERE c.is_active = 1
  GROUP BY c.result_id
) rc
  ON rc.result_id = r.id
JOIN (
  SELECT
    x.node_id,
    x.meta_year,
    COUNT(*) AS meta_count,
    GROUP_CONCAT(
      CONCAT(COALESCE(x.toc_indicator_target_id, 'null-id'),
             ' (number_target=', COALESCE(x.number_target, '-'),
             ', date=', COALESCE(x.target_date, '-'), ')')
      ORDER BY x.toc_indicator_target_id SEPARATOR '; ') AS candidates
  FROM (
    SELECT
      CONVERT(tri.related_node_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AS node_id,
      trit.toc_indicator_target_id,
      trit.number_target,
      trit.target_date,
      CASE
        WHEN trit.target_date REGEXP '^[0-9]{4}-' THEN CAST(LEFT(trit.target_date, 4) AS UNSIGNED)
        WHEN trit.target_date REGEXP '^[0-9]{4}$' THEN CAST(trit.target_date AS SIGNED)
        ELSE NULL
      END AS meta_year
    FROM Integration_information.toc_results_indicators tri
    JOIN Integration_information.toc_result_indicator_target trit
      ON trit.id_indicator = tri.id
     AND CONVERT(trit.toc_result_indicator_id USING utf8mb4)
       = CONVERT(tri.related_node_id USING utf8mb4)
  ) x
  GROUP BY x.node_id, x.meta_year
  HAVING COUNT(*) >= 2
) m
  ON m.node_id = CONVERT(rtri.toc_results_indicator_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
 AND m.meta_year = v.phase_year
WHERE rit.is_active = 1
  AND rit.toc_indicator_target_id IS NULL
  AND rit.contributing_indicator IS NOT NULL
  AND v.phase_year = 2026
ORDER BY r.result_code, rit.indicators_targets;
```

## Block 7. PROD · read-only · Optional dry run: indicators with two 2026 metas

Use it to confirm the falsifier has something to bite on: any node listed here must show up in block 6 if a
candidate row uses it, and must never be in block 3's set.

```sql
-- PROD · read-only
SELECT
  CONVERT(tri.related_node_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AS indicator_node,
  COUNT(*) AS metas_2026,
  GROUP_CONCAT(trit.toc_indicator_target_id ORDER BY trit.toc_indicator_target_id SEPARATOR ', ') AS target_ids
FROM Integration_information.toc_results_indicators tri
JOIN Integration_information.toc_result_indicator_target trit
  ON trit.id_indicator = tri.id
 AND CONVERT(trit.toc_result_indicator_id USING utf8mb4)
   = CONVERT(tri.related_node_id USING utf8mb4)
WHERE (CASE
         WHEN trit.target_date REGEXP '^[0-9]{4}-' THEN CAST(LEFT(trit.target_date, 4) AS UNSIGNED)
         WHEN trit.target_date REGEXP '^[0-9]{4}$' THEN CAST(trit.target_date AS SIGNED)
         ELSE NULL
       END) = 2026
GROUP BY indicator_node
HAVING COUNT(*) >= 2
LIMIT 20;
```

---

## Block 5. PROD · read-only · Verification (run from a FRESH tab, after the COMMIT)

A fresh tab (new session) proves the data is committed and not just visible inside the old transaction.

```sql
-- PROD · read-only (fresh tab)

-- 5a. What is left unanchored among the backed-up rows, by bucket.
SELECT
  b.meta_count = 1 AND b.resolved_anchor IS NOT NULL AS was_updatable,
  CASE WHEN b.meta_count > 1 THEN 'AMBIGUOUS'
       WHEN b.meta_count = 0 THEN 'NO_META'
       ELSE 'SINGLE' END                              AS bucket,
  COUNT(*)                                            AS rows_in_backup,
  SUM(rit.toc_indicator_target_id IS NULL)            AS still_null_now,
  SUM(rit.toc_indicator_target_id = b.resolved_anchor) AS anchored_as_expected
FROM bkp_rit_anchor_20261112 b
JOIN result_indicators_targets rit ON rit.indicators_targets = b.indicators_targets
GROUP BY was_updatable, bucket;

-- 5b. The known case: rit 25057 (created 2026-11-12, result 33767, indicator node 4549a001-...).
-- Robust on purpose: matches by rit id OR by result (id or code) + node prefix.
SELECT
  rit.indicators_targets AS rit_id,
  r.id                   AS result_id,
  r.result_code,
  rtri.toc_results_indicator_id AS indicator_node,
  rit.toc_indicator_target_id   AS anchor_now,
  (rit.toc_indicator_target_id = 333606) AS anchor_is_333606
FROM result_indicators_targets rit
JOIN results_toc_result_indicators rtri
  ON rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
JOIN results_toc_result rtr
  ON rtr.result_toc_result_id = rtri.results_toc_results_id
JOIN result r
  ON r.id = rtr.results_id
WHERE rit.indicators_targets = 25057
   OR ((r.id = 33767 OR r.result_code = 33767)
       AND rtri.toc_results_indicator_id LIKE '4549a001-%');
```

Reading 5a: rows with `was_updatable = 1` must show `still_null_now = 0` and `anchored_as_expected` equal to
`rows_in_backup`. Rows in `AMBIGUOUS` and `NO_META` must keep `still_null_now = rows_in_backup`.
Reading 5b: `anchor_is_333606 = 1`.

## Falsifiers (state of the evidence)

- A row whose indicator has two 2026 metas must appear in block 6 and must **never** be in the UPDATE set. If
  5a shows any `AMBIGUOUS` row with `still_null_now < rows_in_backup`, the backfill touched rows it must not:
  restore from the backup and report.
- Remaining NULL rows among the backed-up rows must equal the not-updatable rows of block 1
  (`AMBIGUOUS` + `NO_META` + single-meta-with-null-id). If they differ, the backfill failed.
  Note: the spec text says "equals the ambiguous count"; rows with no 2026 meta at all also stay NULL, so the
  expected value is `ambiguous + no_meta`, taken from the block 2 sanity line.
- Row 25057 not at 333606 in 5b means the rule or the join does not match the server: inconclusive for the
  whole backfill, do not extend it to other years.

## Rollback after commit (if ever needed)

```sql
-- PROD · write
UPDATE result_indicators_targets rit
JOIN bkp_rit_anchor_20261112 b ON b.indicators_targets = rit.indicators_targets
SET rit.toc_indicator_target_id = b.old_toc_indicator_target_id,
    rit.last_updated_date       = b.old_last_updated_date,
    rit.last_updated_by         = b.old_last_updated_by
WHERE b.meta_count = 1 AND b.resolved_anchor IS NOT NULL
  AND rit.toc_indicator_target_id = b.resolved_anchor;
COMMIT;
```

## Assumptions

- `25057` is a **rit id** (`result_indicators_targets.indicators_targets`) per the design (P-5: "PROD row 25057 created
  2026-11-12 07:04:46"); the requirement text calls it a row of result 33767, indicator node `4549a001-...`. Block 5b
  matches either the rit id or result 33767 (as result id or result code) plus the node prefix, so it works under
  either reading.
- The rit to ToC link uses `results_toc_result_indicators.toc_results_indicator_id = toc_results_indicators.related_node_id`
  (the server's catalog read is keyed on `related_node_id`, `:2672`). A row whose stored indicator id is the numeric
  ToC id spelling (see the comment at `:502-505`) finds no metas here, shows as `NO_META`, and is not touched, exactly
  as the server leaves it NULL.
- The catalog read has no `is_active` filter on the ToC tables (`:2662-2673`); neither has this script.
- The parent chain (`results_toc_result_indicators`, `results_toc_result`, `result`) must be active; this narrows the
  candidate set to what the live read shows. Remove those three `is_active = 1` conditions in all blocks only if the
  user wants inactive-parent rows anchored too.
- `@admin_user_id` is unknown and left NULL; the script fails safe until it is filled.

## Schema sources

Table and column names, with where each comes from (paths under `onecgiar-pr-server/src/`).

| Table.column | Source |
|---|---|
| `result_indicators_targets` | `api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts:11` |
| `.indicators_targets` (PK) | same file `:13-14` |
| `.result_toc_result_indicator_id` | same file `:24` |
| `.number_target` | same file `:18` |
| `.contributing_indicator` | same file `:32` |
| `.target_date` | same file `:54` |
| `.toc_indicator_target_id` | same file `:60` |
| `.is_active`, `.last_updated_date`, `.last_updated_by` | `shared/entities/base-entity.ts:5`, `:20`, `:34` (entity extends `BaseEntity`, entity file `:12`); `last_updated_by` and `last_updated_date` are nullable (`:22`, `:36`) |
| `results_toc_result_indicators` | `api/results/results-toc-results/entities/results-toc-results-indicators.entity.ts:15` |
| `.result_toc_result_indicator_id` (PK), `.toc_results_indicator_id`, `.results_toc_results_id`, `.is_active` | same file `:17-20`, `:24`, `:30`, `:62` |
| `results_toc_result` | `api/results/results-toc-results/entities/results-toc-result.entity.ts:19` |
| `.result_toc_result_id` (PK), `.results_id`, `.initiative_id`, `.is_active` | same file `:23`, `:35`, `:78`, `:113` |
| `result` | `api/results/entities/result.entity.ts:56` (`@Entity()` default name; raw SQL uses `result` at `results-toc-results.repository.ts:2618`) |
| `.id`, `.result_code`, `.is_active`, `.version_id`, `.status_id` | same entity `:60`, `:66`, `:252`, `:267`, `:328` |
| `version` | `api/versioning/entities/version.entity.ts:12` |
| `.id`, `.phase_year` | same file `:15`, `:57`; join and phase-year read as in `results-toc-results.repository.ts:2617-2619` |
| `result_status` | `api/results/result-status/entities/result-status.entity.ts:5` |
| `.result_status_id`, `.status_name` | same file `:8`, `:14` |
| `clarisa_initiatives` | `clarisa/clarisa-initiatives/entities/clarisa-initiative.entity.ts:10` |
| `.id` | same file `:13` |
| `.official_code` | same repository: selected at `:474`, join at `:493-494` (column name only; the entity file was not opened) |
| `results_center` | `api/results/results-centers/entities/results-center.entity.ts:14` (`@Entity('results_center')`) |
| `.center_id`, `.result_id`, `.is_primary`, `.is_leading_result`, `.is_active` | same file `:19-20`, `:22-23`, `:25-30` (column `is_primary`), `:48-49` (column `is_leading_result`), `:51-57` (column `is_active`, default true) |
| `Integration_information.toc_results_indicators` (`id`, `related_node_id`) | no entity (external ToC schema); join shape at `results-toc-results.repository.ts:2667-2672` (`${env.DB_TOC}` is `Integration_information`, user-confirmed) |
| `Integration_information.toc_result_indicator_target` (`id_indicator`, `toc_result_indicator_id`, `toc_indicator_target_id`, `number_target`, `target_date`) | no entity; columns read at `results-toc-results.repository.ts:2664-2666`, join at `:2668-2671`, year parser at `:2677-2681` |
| rule: count of year-matching metas, exactly one wins | `results-toc-results.repository.ts:2846-2857` (ambiguous branch `:2858-2865`) |
