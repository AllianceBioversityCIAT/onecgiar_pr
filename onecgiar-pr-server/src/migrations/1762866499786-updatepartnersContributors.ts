import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatepartnersContributors1762866499786
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_contributor_partner_P25\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_contributor_partner_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
  	DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
  	DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
  	DECLARE planned_result BOOLEAN DEFAULT NULL;
  	DECLARE result_id BIGINT DEFAULT NULL;
  	DECLARE count_institutions BIGINT DEFAULT 0;
  	DECLARE institutions_ids TEXT DEFAULT NULL;
  	DECLARE center_count_all BIGINT DEFAULT 0;
  	DECLARE center_count_leading BIGINT DEFAULT 0;
  	DECLARE institutions_count_leading BIGINT DEFAULT 0;
  	
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
  	
  	IF planned_result = FALSE THEN
  	
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	ELSE
  	
	  	SELECT 
			COUNT(temp.valid) = SUM(temp.valid)
			INTO
			general_validation
		FROM
			(SELECT
				COUNT(rtr.result_toc_result_id) = 
				SUM(valid_text(rtr.toc_progressive_narrative) AND 
					rtr.toc_result_id IS NOT NULL AND 
					rtri.toc_results_indicator_id IS NOT NULL AND 
					rit.number_target > 0) AS valid
			FROM results_toc_result rtr 
				LEFT JOIN results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id 
															AND rtri.is_active = TRUE
															AND rtri.is_not_aplicable = FALSE
				LEFT JOIN result_indicators_targets rit ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id 
														AND rit.is_active = TRUE
				LEFT JOIN \`result\` r ON r.id = rtr.results_id 
				LEFT JOIN version v ON v.id = r.version_id 
			WHERE rtr.results_id = resultId
				AND rtr.is_active = TRUE
				AND r.is_active = TRUE
			GROUP BY rtr.result_toc_result_id, rtri.result_toc_result_indicator_id) temp;
	  	
	  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	SELECT 
  		r.is_lead_by_partner,
  		r.no_applicable_partner,
  		r.id
  		INTO
  		lead_by_partner,
  		no_applicable_partner,
  		result_id
  	FROM \`result\` r 
  	WHERE r.is_active = TRUE
  		AND r.id = resultId;
  	
  	IF (result_id IS NULL) THEN RETURN FALSE; END IF;
  	
  	SELECT
		COUNT(rbi.id),
		GROUP_CONCAT(rbi.id)
		INTO
		count_institutions,
		institutions_ids
	FROM results_by_institution rbi
	WHERE rbi.result_id = resultId
		AND rbi.institution_roles_id IN (2,8)
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
		COUNT(rc.id),
		SUM(IF(rc.is_leading_result = 1 , 1, 0))
		INTO 
		center_count_all,
		center_count_leading
	FROM results_center rc
	WHERE rc.is_active = TRUE
		AND rc.result_id = resultId;
  	
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
  	
  	IF (has_innovation_link = TRUE) THEN
  	
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
	  	WHEN lead_by_partner IS NULL THEN FALSE
	  	WHEN (count_institutions <= 0 AND no_applicable_partner = FALSE) THEN FALSE
		WHEN (count_institutions <> (
			SELECT
				COUNT(DISTINCT rbibdt.result_by_institution_id)
			FROM result_by_institutions_by_deliveries_type rbibdt
			WHERE rbibdt.is_active = TRUE
				AND FIND_IN_SET(rbibdt.result_by_institution_id,institutions_ids))) THEN FALSE
		WHEN center_count_all <= 0 THEN FALSE
		WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
		WHEN center_count_leading <= 0 AND lead_by_partner = 0 THEN FALSE
	  	ELSE TRUE
	  	END; 

END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_contributor_partner_P25\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_contributor_partner_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
  	DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
  	DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
  	DECLARE result_id BIGINT DEFAULT NULL;
  	DECLARE count_institutions BIGINT DEFAULT 0;
  	DECLARE institutions_ids TEXT DEFAULT NULL;
  	DECLARE center_count_all BIGINT DEFAULT 0;
  	DECLARE center_count_leading BIGINT DEFAULT 0;
  	DECLARE institutions_count_leading BIGINT DEFAULT 0;
  	
  	SELECT 
		COUNT(temp.valid) = SUM(temp.valid)
		INTO
		general_validation
	FROM
		(SELECT
			COUNT(rtr.result_toc_result_id) = 
			SUM(valid_text(rtr.toc_progressive_narrative) AND 
				rtr.toc_result_id IS NOT NULL AND 
				rtri.toc_results_indicator_id IS NOT NULL AND 
				rit.number_target > 0) AS valid
		FROM results_toc_result rtr 
			LEFT JOIN results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id 
														AND rtri.is_active = TRUE
														AND rtri.is_not_aplicable = FALSE
			LEFT JOIN result_indicators_targets rit ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id 
													AND rit.is_active = TRUE
			LEFT JOIN \`result\` r ON r.id = rtr.results_id 
			LEFT JOIN version v ON v.id = r.version_id 
		WHERE rtr.results_id = resultId
			AND rtr.is_active = TRUE
			AND r.is_active = TRUE
		GROUP BY rtr.result_toc_result_id, rtri.result_toc_result_indicator_id) temp;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	SELECT 
  		r.is_lead_by_partner,
  		r.no_applicable_partner,
  		r.id
  		INTO
  		lead_by_partner,
  		no_applicable_partner,
  		result_id
  	FROM \`result\` r 
  	WHERE r.is_active = TRUE
  		AND r.id = resultId;
  	
  	IF (result_id IS NULL) THEN RETURN FALSE; END IF;
  	
  	SELECT
		COUNT(rbi.id),
		GROUP_CONCAT(rbi.id)
		INTO
		count_institutions,
		institutions_ids
	FROM results_by_institution rbi
	WHERE rbi.result_id = resultId
		AND rbi.institution_roles_id IN (2,8)
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
		COUNT(rc.id),
		SUM(IF(rc.is_leading_result = 1 , 1, 0))
		INTO 
		center_count_all,
		center_count_leading
	FROM results_center rc
	WHERE rc.is_active = TRUE
		AND rc.result_id = resultId;
  	
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
  	
  	IF (has_innovation_link = TRUE) THEN
  	
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
	  	WHEN lead_by_partner IS NULL THEN FALSE
	  	WHEN (count_institutions <= 0 AND no_applicable_partner = FALSE) THEN FALSE
		WHEN (count_institutions <> (
			SELECT
				COUNT(DISTINCT rbibdt.result_by_institution_id)
			FROM result_by_institutions_by_deliveries_type rbibdt
			WHERE rbibdt.is_active = TRUE
				AND FIND_IN_SET(rbibdt.result_by_institution_id,institutions_ids))) THEN FALSE
		WHEN center_count_all <= 0 THEN FALSE
		WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
		WHEN center_count_leading <= 0 AND lead_by_partner = 0 THEN FALSE
	  	ELSE TRUE
	  	END;

END`);
  }
}
