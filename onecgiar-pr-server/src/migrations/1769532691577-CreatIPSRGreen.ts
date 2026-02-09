import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatIPSRGreen1769532691577 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_one_P25`);
        await queryRunner.query(`CREATE FUNCTION validation_ipsr_step_one_P25(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE result_id BIGINT DEFAULT NULL;
  	DECLARE result_innovaton_package_id BIGINT DEFAULT NULL;
  	DECLARE is_expert_workshop_organized BOOLEAN DEFAULT NULL;
  	DECLARE assessed_during_expert_workshop_id BIGINT DEFAULT NULL;
  	DECLARE count_institutions BIGINT DEFAULT NULL;
  	
	SELECT 
		r.id,
		rbip.result_by_innovation_package_id,
		rip.is_expert_workshop_organized,
		rip.assessed_during_expert_workshop_id
		INTO
		result_id,
		result_innovaton_package_id,
		is_expert_workshop_organized,
		assessed_during_expert_workshop_id
   	FROM
        result r
        LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
        LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = r.id
        											AND rbip.ipsr_role_id = 1
    WHERE
        r.is_active = 1
        AND r.id = resultId;
	
	
  	SELECT
    	COUNT(*) = 0
    	INTO
    	general_validation
    FROM
    	result_ip_eoi_outcomes rieo
    WHERE rieo.result_by_innovation_package_id = result_innovaton_package_id
    AND rieo.is_active = true;
  	
  	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;

  	SELECT 
  		COUNT(*) = 0
  		INTO
    	general_validation
    FROM result_actors ra
    WHERE ra.result_id = resultId
    	AND ra.is_active = 1
        AND (
             (
               ra.sex_and_age_disaggregation = 0
                AND (
                     (ra.actor_type_id != 5
                      AND ra.women IS NOT NULL
                      AND ra.women_youth IS NOT NULL
                      AND ra.men IS NOT NULL
                      AND ra.men_youth IS NOT NULL
                     ) OR 
                     (
                      ra.actor_type_id = 5
                      AND (
                           ra.other_actor_type IS NOT NULL
                           OR TRIM(ra.other_actor_type) <> ''
                          )
                     )
                    )
                   ) OR 
                   (ra.sex_and_age_disaggregation = 1
                    AND ra.how_many IS NOT NULL
                    OR (ra.actor_type_id = 5
                         AND (
                               ra.other_actor_type IS NOT NULL
                               AND TRIM(ra.other_actor_type) <> ''
                               AND ra.how_many IS NOT NULL
                             )
                        )
                    )
                   );
  	
  	SELECT 
  		COUNT(*) = 0 AND general_validation
  		INTO
    	general_validation
    FROM results_by_institution_type rbit
    WHERE rbit.results_id = resultId
    	AND rbit.is_active = true
        AND (
             (
              rbit.institution_types_id != 78
              AND(
                  rbit.institution_roles_id IS NOT NULL
                  AND rbit.institution_types_id IS NOT NULL
                  AND rbit.how_many IS NOT NULL
                 )
             ) OR 
             ( rbit.institution_types_id = 78
               AND ( rbit.other_institution IS NOT NULL
                     OR rbit.other_institution != ''
                     AND rbit.institution_roles_id IS NOT NULL
                     AND rbit.institution_types_id IS NOT NULL
                     AND rbit.how_many IS NOT NULL
                   )
             )
            );
  	
  	 SELECT 
  	 	COUNT(*) = 0 AND general_validation
  	 	INTO
    	general_validation
     FROM result_ip_measure rim
     WHERE rim.result_id = resultId
     	AND rim.is_active = TRUE
        AND rim.unit_of_measure IS NOT NULL
        AND rim.quantity IS NOT NULL;
  	 
  	 IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;

  	 IF (is_expert_workshop_organized IS NULL) THEN RETURN FALSE; END IF;
  	 
  	 IF (is_expert_workshop_organized = 1 AND assessed_during_expert_workshop_id IS NULL) THEN RETURN FALSE; END IF;
  	 
  	 SELECT 
  	  	is_expert_workshop_organized AND ( assessed_during_expert_workshop_id = 1 AND COUNT(*) > 0 )
  	  	INTO
    	general_validation
     FROM result_by_innovation_package rbip
     WHERE rbip.result_innovation_package_id = resultId
      	AND rbip.is_active = TRUE
        AND (
             rbip.current_innovation_readiness_level IS NULL
             OR rbip.current_innovation_use_level IS NULL
            );
  	 
  	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
  	
  	SELECT
    	COUNT(*) > 0 
    	INTO
    	general_validation
    FROM result_actors ra
    WHERE ra.result_id = resultId
    	AND ra.is_active = 1
       	AND (
             (
              ra.sex_and_age_disaggregation = 0
              AND (
                   ra.women IS NULL
                   OR ra.women_youth IS NULL
                   OR ra.men IS NULL
                   OR ra.men_youth IS NULL
                   OR (
                       ra.actor_type_id = 5
                       AND (
                            ra.other_actor_type IS NULL
                            OR TRIM(ra.other_actor_type) = ''
                           )
                      )
                   )
             )OR (
                   ra.sex_and_age_disaggregation = 1
                   AND ra.how_many IS NULL
                   OR ( 
                   		ra.actor_type_id = 5
                        AND (
                              ra.other_actor_type IS NULL
                              OR TRIM(ra.other_actor_type) = ''
                            )
                      )
                 )
            );
  	
  	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
         
	SELECT
    	COUNT(*) > 0
    	INTO
    	general_validation
    FROM results_by_institution_type rbit
    WHERE rbit.results_id = resultId
    	AND rbit.is_active = true
        AND (
              rbit.institution_roles_id IS NULL
              OR rbit.institution_types_id IS NULL
              OR rbit.how_many IS NULL
              OR (
                  rbit.institution_types_id = 78
                  AND (
                       rbit.other_institution IS NULL
                       OR rbit.other_institution = ''
                      )
                 )
            );
	
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;

	SELECT
    	COUNT(*) > 0
    	INTO
    	general_validation
    FROM result_ip_measure rim
    WHERE rim.result_id = resultId
    	AND rim.is_active = TRUE
        AND (
             rim.unit_of_measure IS NULL
             OR rim.quantity IS NULL
            );
	
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
	
	SELECT
    	COUNT(rbi.id)
    	INTO 
    	count_institutions
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
    	AND rbi.institution_roles_id = 5
        AND rbi.is_active = TRUE;
	
	SELECT
    	COUNT(DISTINCT rbibdt.result_by_institution_id) != count_institutions
    	INTO
    	general_validation
    FROM result_by_institutions_by_deliveries_type rbibdt
   	WHERE rbibdt.is_active = true
   		AND rbibdt.result_by_institution_id IN (
                        SELECT
                            rbi2.id
                        FROM
                            results_by_institution rbi2
                        WHERE
                            rbi2.result_id = resultId
                            AND rbi2.institution_roles_id = 5
                            AND rbi2.is_active = TRUE
                            );
	
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;	
	
 	RETURN TRUE;
END`);

        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_two_one_P25`);
        await queryRunner.query(`CREATE FUNCTION validation_ipsr_step_two_one_P25(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
	SELECT
            CASE 
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM result_by_innovation_package rbip 
                    WHERE rbip.is_active = TRUE 
                        AND rbip.ipsr_role_id = 2
                        AND rbip.result_innovation_package_id = r.id
                ) = 0 THEN FALSE
                ELSE TRUE
            END AS validation
            INTO
            general_validation
        FROM
            result r
            LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = r.id
            AND rbip.ipsr_role_id = 1
        WHERE
            r.is_active = 1
            AND r.id = resultId;

 	RETURN general_validation;
END`);

        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_two_two_P25`);
        await queryRunner.query(`CREATE FUNCTION validation_ipsr_step_two_two_P25(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
	SELECT
            CASE 
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM result_by_innovation_package rbip 
                    WHERE rbip.is_active = TRUE 
                        AND rbip.ipsr_role_id = 2
                        AND rbip.result_innovation_package_id = r.id
                ) = 0 THEN FALSE
                ELSE TRUE
            END AS validation
            INTO
            general_validation
        FROM
            result r
            LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = r.id
            AND rbip.ipsr_role_id = 1
        WHERE
            r.is_active = 1
            AND r.id = resultId;

 	RETURN general_validation;
END`);

        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_three_P25`);
        await queryRunner.query(`CREATE FUNCTION validation_ipsr_step_three_P25(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
	SELECT
        CASE
            WHEN (
                (
                    rbip.readiness_level_evidence_based IS NULL
                    OR rbip.readiness_level_evidence_based = ''
                )
                AND (
                    rbip.use_level_evidence_based IS NULL
                    OR rbip.use_level_evidence_based = ''
                )
            )
            OR (
                (
                    (
                        SELECT
                            cirl.level
                        FROM
                            clarisa_innovation_readiness_level cirl
                        WHERE
                            cirl.id = rbip.readiness_level_evidence_based
                    ) != 0
                    AND (
                        rbip.readinees_evidence_link IS NULL
                        OR rbip.readinees_evidence_link = ''
                    )
                )
                OR (
                    (
                        SELECT
                            ciul.level
                        FROM
                            clarisa_innovation_use_levels ciul
                        WHERE
                            ciul.id = rbip.use_level_evidence_based
                    ) != 0
                    AND (
                        rbip.use_evidence_link IS NULL
                        OR rbip.use_evidence_link = ''
                    )
                )
            ) THEN FALSE
            WHEN (
                (
                    SELECT
                        ciul.level
                    FROM
                        clarisa_innovation_use_levels ciul
                    WHERE
                        ciul.id = rbip.use_level_evidence_based
                ) != 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_actors rira
                    WHERE
                        rira.result_ip_result_id = rbip.result_by_innovation_package_id
                        AND rira.is_active = TRUE
                        AND (
                            (
                                rira.sex_and_age_disaggregation = 0
                                AND (
                                    rira.actor_type_id IS NOT NULL
                                    AND rira.women IS NOT NULL
                                    AND rira.women_youth IS NOT NULL
                                    AND rira.men IS NOT NULL
                                    AND rira.men_youth IS NOT NULL
                                    AND rira.evidence_link IS NOT NULL
                                    AND rira.evidence_link != ''
                                    OR (
                                        rira.actor_type_id = 5
                                        AND (
                                            rira.other_actor_type IS NOT NULL
                                            OR TRIM(rira.other_actor_type) <> ''
                                        )
                                    )
                                )
                            )
                            OR (
                                rira.sex_and_age_disaggregation = 1
                                AND (
                                    rira.actor_type_id IS NOT NULL
                                    AND rira.evidence_link IS NOT NULL
                                    AND rira.evidence_link != ''
                                    AND rira.how_many IS NOT NULL
                                    OR (
                                        rira.actor_type_id = 5
                                        AND (
                                            rira.other_actor_type IS NOT NULL
                                            AND TRIM(rira.other_actor_type) <> ''
                                        )
                                    )
                                )
                            )
                        )
                ) = 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_institution_types ririt
                    WHERE
                        ririt.result_ip_results_id = rbip.result_by_innovation_package_id
                        AND ririt.is_active = TRUE
                        AND (
                            ririt.institution_types_id != 78
                            AND (
                                ririt.institution_types_id IS NOT NULL
                                AND ririt.institution_roles_id IS NOT NULL
                                AND ririt.how_many IS NOT NULL
                                AND (
                                    ririt.evidence_link IS NOT NULL
                                    OR ririt.evidence_link != ''
                                )
                            )
                            OR (
                                ririt.institution_types_id = 78
                                AND (
                                    ririt.other_institution IS NOT NULL
                                    OR ririt.other_institution != ''
                                )
                            )
                        )
                ) = 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_measures rirm
                    WHERE
                        rirm.result_ip_result_id = rbip.result_by_innovation_package_id
                        AND rirm.is_active = TRUE
                        AND (
                            rirm.unit_of_measure IS NOT NULL
                            AND rirm.quantity IS NOT NULL
                            AND rirm.evidence_link IS NOT NULL
                        )
                ) = 0
            ) THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_actors rira
                WHERE
                    rira.result_ip_result_id = rbip.result_by_innovation_package_id
                    AND rira.is_active = TRUE
                    AND (
                        (
                            rira.sex_and_age_disaggregation = 0
                            AND (
                                rira.actor_type_id IS NULL
                                OR rira.women IS NULL
                                OR rira.women_youth IS NULL
                                OR rira.men IS NULL
                                OR rira.men_youth IS NULL
                                OR rira.evidence_link IS NULL
                                OR rira.evidence_link = ''
                                OR (
                                    rira.actor_type_id = 5
                                    AND (
                                        rira.other_actor_type IS NULL
                                        OR TRIM(rira.other_actor_type) = ''
                                    )
                                )
                            )
                        )
                        OR (
                            rira.sex_and_age_disaggregation = 1
                            AND (
                                rira.actor_type_id IS NULL
                                OR rira.evidence_link IS NULL
                                OR rira.evidence_link = ''
                                OR rira.how_many IS NULL
                                OR (
                                    rira.actor_type_id = 5
                                    AND (
                                        rira.other_actor_type IS NULL
                                        OR TRIM(rira.other_actor_type) = ''
                                    )
                                )
                            )
                        )
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_institution_types ririt
                WHERE
                    ririt.result_ip_results_id = rbip.result_by_innovation_package_id
                    AND ririt.is_active = TRUE
                    AND (
                        institution_types_id IS NULL
                        OR institution_roles_id IS NULL
                        OR ririt.how_many IS NULL
                        OR ririt.evidence_link IS NULL
                        OR ririt.evidence_link = ''
                        OR ririt.institution_types_id IS NULL
                        OR ririt.institution_types_id IS NULL
                        OR (
                            ririt.institution_types_id = 78
                            AND (
                                ririt.other_institution IS NULL
                                OR ririt.other_institution = ''
                            )
                        )
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_measures rirm
                WHERE
                    rirm.result_ip_result_id = rbip.result_by_innovation_package_id
                    AND rirm.is_active = TRUE
                    AND (
                        rirm.unit_of_measure IS NULL
                        OR rirm.quantity IS NULL
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_by_innovation_package rbip2
                    LEFT JOIN clarisa_innovation_readiness_level cirl2 ON cirl2.id = rbip2.readiness_level_evidence_based
                    LEFT JOIN clarisa_innovation_use_levels ciul2 ON ciul2.id = rbip2.use_level_evidence_based
                WHERE
                    rbip2.is_active = TRUE
                    AND rbip2.ipsr_role_id = 2
                    AND rbip2.result_innovation_package_id = r.id
                    AND (
                        (
                            (
                                cirl2.level != 0
                                OR cirl2.level IS NULL
                            )
                            AND (
                                rbip2.readinees_evidence_link IS NULL
                                OR rbip2.readinees_evidence_link = ''
                            )
                        )
                        OR (
                            (
                                ciul2.level != 0
                                OR ciul2.level IS NULL
                            )
                            AND(
                                rbip2.use_evidence_link IS NULL
                                OR rbip2.use_evidence_link = ''
                            )
                        )
                    )
            ) > 0 THEN FALSE
            ELSE TRUE
        END AS validation
        INTO
        general_validation
    FROM
        result r
        LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
        LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = rip.result_innovation_package_id
        AND rbip.ipsr_role_id = 1
    WHERE
        r.is_active = 1
        AND r.id = resultId;

 	RETURN general_validation;
END`);

        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_four_P25`);
        await queryRunner.query(`CREATE FUNCTION validation_ipsr_step_four_P25(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE result_id BIGINT DEFAULT NULL;
  	DECLARE has_scaling_studies BOOLEAN DEFAULT NULL;
  	
	SELECT 
		r.id,
		rip.has_scaling_studies 
		INTO
		result_id,
		has_scaling_studies
   	FROM
        result r
       	LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
    WHERE
        r.is_active = 1
        AND r.id = resultId;
	
	IF (has_scaling_studies IS NULL) THEN RETURN FALSE; END IF;	
	
	  SELECT
	  	COUNT(*) > 0
	  	INTO 
	  	general_validation
      FROM non_pooled_projetct_budget nppb
      WHERE nppb.result_project_id  IN (
            SELECT
            	rbp.id
            FROM results_by_projects rbp
            WHERE rbp.is_active = 1
            	AND rbp.result_id = resultId)
           AND nppb.is_active = 1
           AND (
                nppb.is_determined != 1
                OR nppb.is_determined IS NULL
               )
           AND nppb.kind_cash IS NULL;
	
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;	
	 
	SELECT
		COUNT(*) > 0
		INTO 
	  	general_validation
    FROM result_institutions_budget ribu
    WHERE ribu.result_institution_id IN (
    		SELECT
            	rbi.id
           	FROM results_by_institution rbi
            WHERE rbi.is_active = 1
            	AND rbi.result_id = resultId)
    	AND ribu.is_active = 1
        AND (
             ribu.is_determined != 1
             OR ribu.is_determined IS NULL
            )
       AND ribu.kind_cash IS NULL;
    
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
	
	 SELECT
	 	COUNT(*) > 0
	 	INTO 
	  	general_validation
     FROM result_initiative_budget ripb
     WHERE ripb.result_initiative_id IN (
                 SELECT
                 	rbi.id
                 FROM results_by_inititiative rbi
                 WHERE rbi.is_active = 1
                 	AND rbi.result_id = resultId)
          AND is_active = TRUE
          AND (
               ripb.is_determined != 1
               OR ripb.is_determined IS NULL
              )
          AND ripb.kind_cash IS NULL;
	 
	IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
	
	IF(has_scaling_studies = 1) THEN
	
		SELECT 
			SUM(IF(valid_text(rssu.study_url), 1, 0)) != COUNT(rssu.id)
			INTO 
			general_validation
		FROM result_scaling_study_urls rssu 
		WHERE rssu.result_innov_package_id = resultId
			AND rssu.is_active = 1;
		
		IF (COALESCE(general_validation, TRUE)) THEN RETURN FALSE; END IF;
	
	END IF;

 	RETURN TRUE;
END`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_one_P25`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_two_one_P25`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_two_two_P25`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_three_P25`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS validation_ipsr_step_four_P25`);
    }

}
