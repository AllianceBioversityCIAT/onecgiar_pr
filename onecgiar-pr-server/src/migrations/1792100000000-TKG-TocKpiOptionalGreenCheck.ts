import { MigrationInterface, QueryRunner } from 'typeorm';
import { CONTRIBUTOR_PARTNER_WITH_IMPACT } from './1792000000000-IRS-ImpactResultsFoundation';

/**
 * P2-4061 / spec bugfix/toc-kpi-optional-green-check (TKG-T-1).
 *
 * Redefines `validation_contributor_partner_P25` so that, for results of phase year 2026 or later,
 * an unanswered ToC question (planned_result NULL, TKG-DD-2) no longer blocks the green check.
 * Yes / No / 2025 / type-9 behaviour is unchanged (TKG-NFR-2).
 *
 * Base body: CONTRIBUTOR_PARTNER_WITH_IMPACT from 1792000000000-IRS-ImpactResultsFoundation (TKG-DD-3).
 * The only additions are the lines tagged with the TKG-GATE marker, plus IF -> ELSEIF on the
 * planned_result = FALSE branch. The regression spec relies on that marker.
 * `down` restores CONTRIBUTOR_PARTNER_WITH_IMPACT (imported, so the two cannot drift).
 */
const CONTRIBUTOR_PARTNER_WITH_GATE = `CREATE FUNCTION \`validation_contributor_partner_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
       DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
      DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
      DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
      DECLARE planned_result BOOLEAN DEFAULT NULL;
      DECLARE result_id BIGINT DEFAULT NULL;
      DECLARE result_type_id BIGINT DEFAULT NULL;
      DECLARE count_institutions BIGINT DEFAULT 0;
      DECLARE institutions_ids TEXT DEFAULT NULL;
      DECLARE institutions_count_leading BIGINT DEFAULT 0;
      DECLARE phase_year INT DEFAULT NULL; -- TKG-GATE

      -- IRS-DD-5: load the result type BEFORE the ToC block so type 9 can bypass it.
      SELECT r.result_type_id INTO result_type_id FROM \`result\` r WHERE r.id = resultId AND r.is_active = TRUE;

      -- TKG-DD-1: phase year of the result, read inside the function. -- TKG-GATE
      SELECT v.phase_year INTO phase_year FROM \`result\` r INNER JOIN version v ON v.id = r.version_id WHERE r.id = resultId LIMIT 1; -- TKG-GATE

      IF COALESCE(result_type_id, 0) <> 9 THEN

      SELECT
        rtr.planned_result,
        valid_text(rtr.toc_progressive_narrative)
        INTO
        planned_result,
        general_validation
    FROM results_toc_result rtr
    WHERE rtr.is_active = TRUE
        AND rtr.results_id = resultId
    LIMIT 1;

      IF planned_result IS NULL AND COALESCE(phase_year, 0) >= 2026 THEN -- TKG-GATE
          SET general_validation = TRUE; -- TKG-GATE
      ELSEIF planned_result = FALSE THEN

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      ELSE

    SELECT
      COUNT(temp.valid) = SUM(temp.valid)
    INTO
      general_validation
    FROM
    (
      SELECT
        CAST(
          (
            (
              rtr.toc_progressive_narrative IS NULL
              OR TRIM(rtr.toc_progressive_narrative) = ''
              OR valid_text(rtr.toc_progressive_narrative)
            )
            AND rtr.toc_result_id IS NOT NULL
            AND COUNT(rtri.result_toc_result_indicator_id) > 0
            AND COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1
          ) AS UNSIGNED
        ) AS valid
      FROM results_toc_result rtr
        LEFT JOIN results_toc_result_indicators rtri
          ON rtri.results_toc_results_id = rtr.result_toc_result_id
         AND rtri.is_active = TRUE
         AND rtri.is_not_aplicable = FALSE
        LEFT JOIN result_indicators_targets rit
          ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
         AND rit.is_active = TRUE
        LEFT JOIN \`result\` r ON r.id = rtr.results_id
      WHERE rtr.results_id = resultId
        AND rtr.is_active = TRUE
        AND r.is_active = TRUE
      GROUP BY rtr.result_toc_result_id
    ) temp;


          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      END IF;

      SELECT
          r.is_lead_by_partner,
          r.no_applicable_partner,
          r.id,
          r.result_type_id
          INTO
          lead_by_partner,
          no_applicable_partner,
          result_id,
          result_type_id
      FROM \`result\` r
      WHERE r.is_active = TRUE
          AND r.id = resultId;

      IF (result_id IS NULL) THEN RETURN FALSE; END IF;
      IF (no_applicable_partner IS NULL) THEN RETURN FALSE; END IF;

      SELECT
         COUNT(rbi.id),
         GROUP_CONCAT(rbi.id)
         INTO
         count_institutions,
         institutions_ids
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
         AND rbi.institution_roles_id = IF(result_type_id = 6, 8, 2)
         AND rbi.is_active = TRUE;

      SELECT
        COUNT(rbi.id)
        INTO
        institutions_count_leading
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
        AND rbi.is_leading_result = TRUE
        AND rbi.is_active = TRUE;

      SELECT
          rid.has_innovation_link IS NOT NULL AND
          rid.has_innovation_link = TRUE
        INTO
        has_innovation_link
      FROM results_innovations_dev rid
      WHERE rid.results_id = resultId
          AND rid.is_active = TRUE;

      SELECT
          riu.has_innovation_link IS NOT NULL AND
          riu.has_innovation_link = TRUE OR has_innovation_link
        INTO
        has_innovation_link
      FROM results_innovations_use riu
      WHERE riu.results_id = resultId
          AND riu.is_active = TRUE;

      IF (has_innovation_link = TRUE AND COALESCE(result_type_id, 0) <> 9) THEN

          SELECT
              COUNT(*) > 0
              INTO
              general_validation
          FROM linked_result lr
          WHERE lr.origin_result_id = resultId
              AND lr.is_active = TRUE;

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      RETURN CASE
          WHEN no_applicable_partner = TRUE THEN TRUE
          WHEN lead_by_partner IS NULL THEN FALSE
          WHEN no_applicable_partner = FALSE AND count_institutions = 0 THEN FALSE
          WHEN (count_institutions > 0 AND count_institutions <> (
               SELECT COUNT(DISTINCT rbibdt.result_by_institution_id)
               FROM result_by_institutions_by_deliveries_type rbibdt
               WHERE rbibdt.is_active = TRUE
                   AND FIND_IN_SET(rbibdt.result_by_institution_id, institutions_ids)
           )) THEN FALSE
           WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
           ELSE TRUE
           END;

END`;

export class TKGTocKpiOptionalGreenCheck1792100000000
  implements MigrationInterface
{
  name = 'TKGTocKpiOptionalGreenCheck1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_contributor_partner_P25`',
    );
    await queryRunner.query(CONTRIBUTOR_PARTNER_WITH_GATE);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_contributor_partner_P25`',
    );
    await queryRunner.query(CONTRIBUTOR_PARTNER_WITH_IMPACT);
  }
}
