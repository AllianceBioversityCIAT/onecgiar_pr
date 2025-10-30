import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateValidtionP221761849861521 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`validate_sections_mapped_batch\``,
    );
    await queryRunner.query(`CREATE PROCEDURE \`validate_sections_mapped_batch\`(
  IN p_result_id BIGINT,
  IN p_sections_json JSON
)
BEGIN
  DECLARE v_portfolio_code VARCHAR(25);
  DECLARE v_json_length INT;
  DECLARE v_counter INT DEFAULT 0;
  DECLARE v_display_name VARCHAR(255);
  DECLARE v_function_name VARCHAR(255);
  DECLARE v_full_function VARCHAR(500);
  DECLARE v_function_exists INT DEFAULT 0;
  DECLARE v_continue_processing BOOLEAN DEFAULT TRUE;
  DECLARE v_validation_result TINYINT DEFAULT 0;
  
  -- Obtener datos críticos
  SELECT 
    cp.acronym
    INTO 
    v_portfolio_code
  FROM \`result\` r 
    INNER JOIN version v ON v.id = r.version_id 
    INNER JOIN clarisa_portfolios cp ON cp.id = v.portfolio_id 
  WHERE r.id = p_result_id
    AND r.is_active = TRUE;

  SET v_json_length = JSON_LENGTH(p_sections_json);
  
  -- Validación inicial
  IF v_json_length = 0 OR v_portfolio_code IS NULL THEN
    SELECT 'No data available' as section_name, FALSE as is_valid;
    SET v_continue_processing = FALSE;
  END IF;

  -- Solo procesar si la validación inicial pasó
  IF v_continue_processing THEN
    -- Tabla temporal para resultados
    CREATE TEMPORARY TABLE temp_validation_results (
      display_name VARCHAR(255),
      validation BOOLEAN,
      execution_order INT,
      PRIMARY KEY (display_name)
    ) ENGINE = MEMORY;

    -- Procesar cada sección
    WHILE v_counter < v_json_length DO
      SET v_display_name = JSON_UNQUOTE(JSON_EXTRACT(p_sections_json, CONCAT('$[', v_counter, ']')));
      SET v_function_name = NULL; -- Reset para cada iteración
      
      -- Buscar mapeo de función
      SELECT 
        vm.function_name 
        INTO
        v_function_name
      FROM validation_maps vm 
      WHERE vm.display_name = v_display_name 
        AND vm.is_active = TRUE;
      
      IF v_function_name IS NOT NULL THEN
        -- Construir nombre completo de función
        SET v_full_function = CONCAT('validation_', v_function_name, '_', v_portfolio_code);
        
        -- Verificar si la función existe
        SELECT COUNT(*) INTO v_function_exists
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA = DATABASE() 
          AND ROUTINE_NAME = v_full_function 
          AND ROUTINE_TYPE = 'FUNCTION';
        
        IF v_function_exists > 0 THEN
          -- Ejecutar función existente usando SQL dinámico CORREGIDO
          SET @validation_sql = CONCAT(
            'SELECT ', v_full_function, '(', p_result_id, ') INTO @validation_result'
          );
          PREPARE validation_stmt FROM @validation_sql;
          EXECUTE validation_stmt;
          DEALLOCATE PREPARE validation_stmt;
          
          -- Insertar el resultado obtenido
          INSERT INTO temp_validation_results VALUES (v_display_name, @validation_result, v_counter);
        ELSE
          -- Función no existe, insertar FALSE
          INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
        END IF;
      ELSE
        -- Mapeo no encontrado, insertar FALSE
        INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
      END IF;
      
      SET v_counter = v_counter + 1;
    END WHILE;

    -- Retornar resultados ordenados
    SELECT display_name as section_name, validation 
    FROM temp_validation_results 
    ORDER BY execution_order;
    
    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS temp_validation_results;
  END IF;
END`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);
    await queryRunner.query(`CREATE FUNCTION \`valid_text\`(text TEXT) RETURNS tinyint(1)
        READS SQL DATA
        DETERMINISTIC
    BEGIN
            RETURN IF(
                text IS NOT NULL, 
                LENGTH(TRIM(REGEXP_REPLACE(text, '\\s+', ''))) > 0, 
                FALSE
            );
    END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_capacity_dev_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_capacity_dev_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE is_attending_for_organization BOOLEAN DEFAULT NULL;
  	
  	SELECT 
  		rcd.female_using IS NOT NULL AND
		rcd.male_using IS NOT NULL AND
		non_binary_using IS NOT NULL AND
		rcd.has_unkown_using IS NOT NULL AND
		valid_text(rcd.capdev_term_id) AND
		valid_text(rcd.capdev_delivery_method_id) AND
		rcd.is_attending_for_organization IS NOT NULL,
		rcd.is_attending_for_organization
		INTO
		general_validation,
		is_attending_for_organization
  	FROM result r
		LEFT JOIN results_capacity_developments rcd ON rcd.result_id = r.id
													AND rcd.is_active = TRUE
	WHERE r.id = resultId
		AND r.is_active = TRUE;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	IF (is_attending_for_organization = TRUE) THEN
  	
  		SELECT
			COUNT(rbi.id) > 0
			INTO
			general_validation
		FROM results_by_institution rbi
		WHERE rbi.result_id = resultId
			AND rbi.institution_roles_id = 3
			AND rbi.is_active = TRUE;
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_evidences_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_evidences_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE gender_tag_level BIGINT DEFAULT NULL;
  	DECLARE climate_change_tag_level BIGINT DEFAULT NULL;
  	DECLARE nutrition_tag_level BIGINT DEFAULT NULL;
  	DECLARE environmental_biodiversity_tag_level BIGINT DEFAULT NULL;
  	DECLARE poverty_tag_level BIGINT DEFAULT NULL;
  	DECLARE result_type BIGINT DEFAULT NULL;
  	DECLARE readiness_level BIGINT DEFAULT NULL;
  	DECLARE evidences_count BIGINT DEFAULT NULL;
  	DECLARE isAnyDAC3 BOOLEAN DEFAULT FALSE;
  	
  	SELECT
  		COUNT(e.id)
  		INTO 
  		evidences_count
  	FROM evidence e 
  	WHERE e.result_id = resultId
  		AND e.is_active = TRUE;
  	
  	SELECT 
  		r.gender_tag_level_id,
  		r.climate_change_tag_level_id,
  		r.nutrition_tag_level_id,
  		r.result_type_id,
  		cirl.\`level\`,
  		r.gender_tag_level_id = 3 OR
		r.climate_change_tag_level_id = 3 OR
		r.nutrition_tag_level_id = 3 OR
		r.environmental_biodiversity_tag_level_id = 3 OR
		r.poverty_tag_level_id = 3
  		INTO
  		gender_tag_level,
  		climate_change_tag_level,
  		nutrition_tag_level,
  		result_type,
  		readiness_level,
  		isAnyDAC3
  	FROM \`result\` r 
  		LEFT JOIN results_innovations_dev rid ON rid.results_id = r.id
											AND rid.is_active > 0
		LEFT JOIN clarisa_innovation_readiness_level cirl ON rid.innovation_readiness_level_id = cirl.id
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
  	IF (result_type = 5 AND evidences_count = 0) THEN
  	
  		RETURN TRUE;
  	
  	END IF;
  	
  	IF (result_type = 7 AND readiness_level = 0 AND isAnyDAC3 = FALSE) THEN
  	
  		RETURN TRUE;
  	
  	END IF;
  	
  	SELECT 
	  	IF((SUM(IF(e.link IS NOT NULL AND e.link <> '',
					1,
					0)) - COUNT(e.id)) IS NULL, 0,
			(SUM(IF(e.link IS NOT NULL AND e.link <> '',
					1,
					0)) - COUNT(e.id))) = 0 AND
		SUM(IF(gender_tag_level = 3 AND e.gender_related = 1,
				1,
				IF(gender_tag_level IN (1, 2),
					1,
					IF(gender_tag_level IS NULL, 1, 0)))) > 0 AND
		SUM(IF(climate_change_tag_level = 3 AND e.youth_related = 1,
				1,
				IF(climate_change_tag_level IN (1, 2),
					1,
					IF(climate_change_tag_level IS NULL, 1, 0)))) > 0 AND
		SUM(IF(nutrition_tag_level = 3 AND e.nutrition_related = 1,
				1,
				IF(nutrition_tag_level IN (1, 2),
					1,
					IF(nutrition_tag_level IS NULL, 1, 0)))) > 0 AND 
		SUM(IF(environmental_biodiversity_tag_level = 3 AND e.environmental_biodiversity_related = 1,
				1,
				IF(environmental_biodiversity_tag_level IN (1, 2),
					1,
					IF(environmental_biodiversity_tag_level IS NULL,
						1,
						0)))) > 0 AND
		SUM(IF(poverty_tag_level = 3 AND e.poverty_related = 1,
				1,
				IF(poverty_tag_level IN (1, 2),
					1,
					IF(poverty_tag_level IS NULL, 1, 0)))) > 0
		INTO
		general_validation
  	FROM evidence e
	WHERE e.result_id = resultId
		AND e.is_supplementary = 0
		AND e.is_active = TRUE;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	SELECT
		IF((SUM(IF(e.link IS NOT NULL AND e.link <> '',
					1,
					0)) - COUNT(e.id)) IS NULL,
			0,
			(SUM(IF(e.link IS NOT NULL AND e.link <> '',
					1,
					0)) - COUNT(e.id))) = 0
		INTO
		general_validation
	FROM evidence e
	WHERE e.result_id = resultId
		AND e.is_supplementary = 1
		AND e.is_active = TRUE;

  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	IF ( result_type = 7 AND readiness_level <> 0) THEN
	
		SELECT
			count(*) > 0
			INTO
			general_validation
		FROM evidence e
		WHERE e.result_id = resultId
			AND e.is_active = TRUE
			AND e.innovation_readiness_related = TRUE
			AND valid_text(e.link);
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	END IF;
  	
 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_general_information_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_general_information_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE result_type BIGINT DEFAULT NULL;
  	DECLARE discontinued_replicated BOOLEAN DEFAULT NULL;
  
  	SELECT 
  		valid_text(r.title) AND
  		valid_text(r.gender_tag_level_id) AND 
  		valid_text(r.climate_change_tag_level_id) AND
  		valid_text(r.nutrition_tag_level_id) AND
  		valid_text(r.environmental_biodiversity_tag_level_id) AND
  		valid_text(r.poverty_tag_level_id)  AND
  		IF(r.result_type_id <> 6, valid_text(r.description), TRUE),
  		r.result_type_id,
  		r.is_discontinued AND r.is_replicated
  		INTO
  		general_validation,
  		result_type,
  		discontinued_replicated
  	FROM \`result\` r 
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
  	IF (result_type = 7 AND discontinued_replicated <> 0) THEN
  		
	  	SELECT 
			SUM(IF(rido.investment_discontinued_option_id = 6, 
				IF(valid_text(rido.description), 1, 0),1)) - COUNT(rido.results_investment_discontinued_option_id) = 0 AND general_validation
			INTO 
			general_validation
		FROM results_investment_discontinued_options rido
		WHERE rido.is_active = TRUE
			AND rido.result_id = resultId;
  		
  	END IF;
  	
 	RETURN general_validation;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_geo_location_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_geo_location_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE geo_scope BIGINT DEFAULT NULL;
  	DECLARE has_countries BOOLEAN DEFAULT NULL;
  	DECLARE has_regions BOOLEAN DEFAULT NULL;
  	
  	SELECT 
  		r.geographic_scope_id,
  		r.has_countries,
  		r.has_regions 
  		INTO
  		geo_scope,
  		has_countries,
  		has_regions
  	FROM \`result\` r 
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
  	IF (geo_scope IS NULL) THEN 
  	
  		RETURN FALSE; 
  		
  	ELSEIF(geo_scope = 50) THEN
  	
  		RETURN TRUE;
  	
  	END IF;  
  	
  	
  	
  	-- SCOPE 1,2
  	
	IF ( geo_scope IN (1, 2) ) THEN 
	
		IF ( has_regions = TRUE OR geo_scope = 2 ) THEN 
		
			SELECT
				COUNT(rr.result_region_id) > 0
				INTO
				general_validation
			FROM result_region rr
			WHERE rr.result_id = resultId
				AND rr.is_active = TRUE;
			
			IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

		ELSEIF ( has_regions IS NULL ) THEN
		
			RETURN FALSE;
		
		END IF;
		
		IF (  has_countries = TRUE ) THEN 
		
			SELECT
				COUNT(rc.result_country_id) > 0
				INTO
				general_validation
			FROM result_country rc
			WHERE rc.result_id = resultId
				AND rc.is_active = TRUE;
			
			IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

		ELSEIF ( has_countries IS NULL ) THEN
		
			RETURN FALSE;
		
		END IF;

	
	END IF;
	
	-- SCOPE 3,4
	
	IF ( geo_scope IN (3, 4) ) THEN
	
		SELECT
			COUNT(rc.result_country_id) > 0
			INTO
			general_validation
		FROM result_country rc
		WHERE rc.result_id = resultId
			AND rc.is_active = TRUE;
			
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	END IF;
	
	-- SCOPE 5
	
	IF ( geo_scope = 5 ) THEN
	
		SELECT 
			IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
			INTO
			general_validation
		FROM (SELECT IF((SELECT COUNT(css.code)
							FROM clarisa_subnational_scopes css
							WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
				FROM result_country rc
				LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
				LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
														AND rcs.is_active = TRUE
		WHERE rc.result_id = resultId
			AND rc.is_active = TRUE
		GROUP by  rc.country_id, cc.name) temp;
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	END IF;

 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_innovation_dev_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_innovation_dev_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
	DECLARE innovation_user_to_be_determined BIGINT DEFAULT NULL;
	-- Validation of the attributes of the main table result_innovation_dev
	SELECT 
		rid.innovation_user_to_be_determined,
		r.id IS NOT NULL AND
		valid_text(rid.short_title) AND
		rid.innovation_characterization_id IS NOT NULL AND
		rid.innovation_nature_id IS NOT NULL AND
		IF(rid.innovation_nature_id = 12,
			rid.is_new_variety IS NOT NULL, TRUE) AND
		rid.innovation_user_to_be_determined IS NOT NULL AND
		rid.innovation_readiness_level_id IS NOT NULL AND
		valid_text(rid.evidences_justification) AS general_data
		INTO
		innovation_user_to_be_determined,
		general_validation
	FROM \`result\` r 
	INNER JOIN results_innovations_dev rid ON rid.results_id = r.id 
	WHERE r.is_active = TRUE
		AND r.id = resultId
		AND rid.is_active = TRUE;


	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	IF (innovation_user_to_be_determined = 0) THEN
	
		-- Actors validation
		SELECT
			COUNT(ra.result_actors_id) =
			COALESCE(SUM(valid_text(ra.addressing_demands) AND 
				ra.actor_type_id IS NOT NULL AND 
				IF(ra.actor_type_id = 5,
					valid_text(ra.other_actor_type),
					TRUE) AND 
				IF( ra.sex_and_age_disaggregation = 1,
					(ra.has_women IS NOT NULL OR
					 ra.has_women_youth IS NOT NULL OR
					 ra.has_men IS NOT NULL OR
					 ra.has_men_youth IS NOT NULL),
					 TRUE)), 
			FALSE)
			INTO
			general_validation
		FROM result_actors ra
		WHERE ra.result_id = resultId
			AND ra.is_active = TRUE;
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
		
		-- Institutions type validation	
		SELECT 
			COUNT(rbit.id) =
			COALESCE(SUM(valid_text(rbit.addressing_demands) AND 
				rbit.institution_types_id IS NOT NULL AND 
				IF(rbit.institution_types_id = 78,
					valid_text(rbit.other_institution),
					TRUE)), 
			FALSE) 
			INTO
			general_validation
		FROM results_by_institution_type rbit
		WHERE rbit.results_id = resultId
			AND rbit.is_active = TRUE
			AND rbit.institution_roles_id = 5;
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
		
		-- IP measure validation
		SELECT 
			COUNT(rim.result_ip_measure_id) =
			COALESCE(SUM(valid_text(rim.unit_of_measure) AND
				valid_text(rim.addressing_demands)), 
			FALSE)
			INTO
			general_validation
		FROM result_ip_measure rim
		WHERE rim.result_id = resultId
			AND rim.is_active = TRUE;
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
			
	END IF;
	
	
	-- questions 2 and 3 (1 and 2 on front-end)
	-- both question 2 and 3 have been answered "answer_boolean = true"
	SELECT
		COUNT(*) = 2 
		INTO
		general_validation
	FROM result_questions rq
		LEFT JOIN result_answers ra ON ra.result_question_id = rq.result_question_id
	WHERE ra.result_id = resultId
		AND ra.answer_boolean = TRUE
		AND rq.parent_question_id IN (2,3);	
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	SELECT 
		CASE
			WHEN (
					SELECT COUNT(*) 
					FROM result_answers ra
					LEFT JOIN result_questions rq345 on ra.result_question_id = rq345.result_question_id
					WHERE ra.result_id = resultId
						AND rq345.parent_question_id IN (2, 3)
						AND ra.result_question_id NOT IN (4,8)
						AND ra.answer_boolean = TRUE
				) > 0 THEN TRUE
			WHEN (
					SELECT COUNT(*) 
					FROM result_answers ra
					WHERE ra.result_id = resultId
						AND ra.result_question_id IN (4, 8)
						AND (ra.answer_boolean IS NULL OR ra.answer_boolean = FALSE)
				) > 0 THEN TRUE
			WHEN ((
					SELECT COUNT(*) 
					FROM result_answers ra
					WHERE ra.result_id = resultId
						AND ra.result_question_id IN (4, 8)
						AND ra.answer_boolean = TRUE
				) > 0 
				AND (
					SELECT COUNT(*) 
					FROM result_answers ra_child
					JOIN result_questions rq_child ON ra_child.result_question_id = rq_child.result_question_id
					WHERE ra_child.result_id = resultId
						AND ra_child.answer_boolean = TRUE
						AND rq_child.parent_question_id IN (4, 8)
				) > 0) THEN TRUE
			ELSE FALSE
		END
	INTO
	general_validation;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	SELECT 
		COUNT(temp_table.result_question_id) = COALESCE(SUM(count_answer), FALSE)
		INTO
		general_validation
	FROM (SELECT 
				rq.result_question_id, 
				COUNT(ra.result_answer_id) = COALESCE(SUM(valid_text(ra.answer_text)), 0) AS count_answer
			FROM result_questions rq
				LEFT JOIN result_questions rq_parent ON rq.parent_question_id = rq_parent.result_question_id
				LEFT JOIN result_answers ra ON ra.result_question_id = rq.result_question_id
											AND ra.is_active = TRUE
				LEFT JOIN result_answers ra_parent ON ra_parent.result_question_id = rq_parent.result_question_id 
												AND ra_parent.is_active = TRUE
												AND COALESCE(ra_parent.answer_boolean, FALSE) = TRUE
												AND ra.result_id = ra_parent.result_id 
			WHERE rq.result_question_id IN (17, 24) 
				AND ra.result_id = resultId
				AND COALESCE(ra.answer_boolean, 0) = 1
			GROUP BY rq.result_question_id) temp_table;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	-- validations about question 26 (intellectual rights on front)
	-- validate that question 27 have been answered
	
	SELECT 	
		COUNT(*) > 0
		INTO
		general_validation
	FROM result_questions rq
		LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
	WHERE ra.result_id = resultId
		AND ra.answer_boolean = TRUE
		AND rq.parent_question_id = 27;
		
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	-- validate that question 28 have been answered if question 30 or 31 have been marked as yes
	
	IF (
	    SELECT 1
	    FROM result_questions rq2
	    JOIN result_answers ra2 ON rq2.result_question_id = ra2.result_question_id
	    WHERE ra2.result_id = resultId
	        AND ra2.answer_boolean = TRUE
	        AND rq2.result_question_id IN (30, 31)
	) = 1 THEN
	    IF NOT EXISTS (
	        SELECT 1
	        FROM result_questions rq
	        JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
	        WHERE ra.result_id = resultId
	            AND ra.answer_boolean = TRUE
	            AND rq.parent_question_id = 28
	    ) THEN
	        RETURN FALSE;
	    END IF;
	END IF;

	-- validate that question 29 have been answered if question 33 or 34 have been marked as yes
	
	IF (
	    SELECT DISTINCT 1
	    FROM result_questions rq2
	    JOIN result_answers ra2 ON rq2.result_question_id = ra2.result_question_id
	    WHERE ra2.result_id = resultId
	        AND ra2.answer_boolean = TRUE
	        AND rq2.result_question_id IN (33, 34)
	) = 1 THEN
	    IF NOT EXISTS (
	        SELECT 1
	        FROM result_questions rq
	        JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
	        WHERE ra.result_id = resultId
	            AND ra.answer_boolean = TRUE
	            AND rq.parent_question_id = 29
	    ) THEN
	        RETURN FALSE;
	    END IF;
	END IF;
	
	-- validations about question 38 (team diversity on front)
	-- validate that question 38 have been answered
	
	SELECT
		COUNT(*) > 0
		INTO
		general_validation
	FROM result_questions rq
		LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
	WHERE ra.result_id = resultId
		AND ra.answer_boolean = TRUE
		AND rq.parent_question_id = 38;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	-- unique answers for question 39
	SELECT (
				SELECT
					COUNT(*)
				FROM
					result_questions rq
				LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
				WHERE
					ra.result_id = resultId
					AND ra.answer_boolean = TRUE
					AND ra.result_question_id = 39
			) = (
				SELECT
					COUNT(DISTINCT rq.parent_question_id)
				FROM
					result_answers ra
				LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
				WHERE
					ra.result_id = resultId
					AND ra.answer_boolean = TRUE
					AND rq.parent_question_id = 39
			)
	INTO
	general_validation;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	SELECT
		CASE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					result_answers ra
				LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
				WHERE
					ra.result_id = resultId
					AND rq.parent_question_id = 38
					AND ra.answer_boolean = TRUE
					AND ra.result_question_id <> 39
			) > 0 THEN TRUE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					result_answers ra
				LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
				WHERE
					ra.result_id = resultId
					AND ra.result_question_id = 47
					AND (
						coalesce(ra.answer_boolean, 0) = 0
						OR(
							ra.answer_boolean = TRUE
							AND COALESCE(TRIM(ra.answer_text), '') <> ''
						)
					)
			) > 0 THEN TRUE
			ELSE FALSE
		END
	INTO
	general_validation;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	SELECT 
		COUNT(*) > 0
		INTO
		general_validation
	FROM result_answers ra
		LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
	WHERE ra.result_id = resultId
		AND rq.parent_question_id = 52
		AND ra.answer_boolean = TRUE;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	SELECT
		COUNT(*) = COALESCE(SUM(IF(
						COALESCE(rib.is_determined, 0) = 0,
						COALESCE(rib.kind_cash, 0) >= 0,
						TRUE
						)), FALSE)
		INTO
		general_validation
	FROM results_by_inititiative rbi
		LEFT JOIN result_initiative_budget rib ON rib.result_initiative_id = rbi.id
												AND rib.is_active = TRUE
	WHERE rbi.result_id = resultId 
		AND rbi.is_active = TRUE;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	SELECT
		COUNT(*) = COALESCE(SUM(IF(
					COALESCE(nppb.is_determined, 0) = 0,
					COALESCE(nppb.kind_cash, 0) >= 0,
					TRUE
					)), FALSE)
		INTO
		general_validation
	FROM non_pooled_project npp
		LEFT JOIN non_pooled_projetct_budget nppb ON nppb.non_pooled_projetct_id = npp.id
													AND nppb.is_active
	WHERE npp.results_id = resultId 
		AND npp.is_active = TRUE;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	SELECT
		COUNT(*) = COALESCE(SUM(IF(
					COALESCE(ribu.is_determined, 0) = 0,
					COALESCE(ribu.kind_cash, 0) >= 0,
					TRUE
					)), FALSE)
		INTO
		general_validation
	FROM
		results_by_institution rbi
	LEFT JOIN result_institutions_budget ribu 
		ON ribu.result_institution_id = rbi.id
		AND ribu.is_active
	WHERE rbi.result_id = resultId
		AND rbi.is_active = TRUE;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_innovation_use_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_innovation_use_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
  	SELECT
		COUNT(*) > 0
		INTO
		general_validation
	FROM result_actors ra
	WHERE ra.result_id = resultId
		AND ra.is_active = TRUE
		AND (
				( 
					ra.sex_and_age_disaggregation = 0 AND
					 (
					 	(
					 		ra.actor_type_id != 5 AND 
						 	ra.women IS NOT NULL AND 
						 	ra.women_youth IS NOT NULL AND 
						 	ra.men IS NOT NULL AND 
						 	ra.men_youth IS NOT NULL
					 	) OR 
					    (
					    	ra.actor_type_id = 5 AND 
						  	valid_text(ra.other_actor_type)
					  	)
					 )
			  	 ) OR 
				 (
				 	ra.sex_and_age_disaggregation = 1 OR 
				 	(
				 		ra.actor_type_id = 5 AND 
				 		(
				 		 	valid_text(ra.other_actor_type) AND 
				 		 	ra.how_many IS NOT NULL
				 		)
				 	)
				 )
			);
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	SELECT
		COUNT(*) > 0
		INTO
		general_validation
	FROM results_by_institution_type rbit
	WHERE rbit.results_id = resultId
		AND rbit.is_active = TRUE
		AND rbit.institution_roles_id = 5
		AND (
				(
					rbit.institution_types_id != 78 AND
					(
						rbit.institution_roles_id IS NOT NULL AND 
						rbit.institution_types_id IS NOT NULL
					)
				) OR 
				(
					rbit.institution_types_id = 78 AND 
					(
						valid_text(rbit.other_institution) AND 
						rbit.institution_roles_id IS NOT NULL AND 
						rbit.institution_types_id IS NOT NULL
					)
				)
			);
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	SELECT
		COUNT(*) > 0
		INTO
		general_validation
	FROM result_ip_measure rim
	WHERE rim.result_id = resultId
		AND rim.is_active = TRUE
		AND rim.unit_of_measure IS NOT NULL;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
	SELECT
		COUNT(*) = 0
		INTO
		general_validation
	FROM result_actors ra
	WHERE ra.result_id = resultId
		AND ra.is_active = TRUE
		AND (
				(
					ra.sex_and_age_disaggregation = 0 AND 
					(
						ra.women IS NULL AND 
						ra.women IS NULL AND 
						ra.women_youth IS NULL AND 
						ra.men IS NULL AND 
						ra.men_youth IS NULL OR 
						(
							ra.actor_type_id = 5 AND 
							NOT valid_text(ra.other_actor_type) 
						)
					)
				) OR 
				(
					ra.sex_and_age_disaggregation = 1 AND 
					ra.how_many IS NULL OR 
					(
						ra.actor_type_id = 5 AND 
						NOT valid_text(ra.other_actor_type)
					)
				)
			);  
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;	
	
	SELECT
		COUNT(*) = 0
		INTO
		general_validation
	FROM results_by_institution_type rbit
	WHERE rbit.results_id = resultId
		AND rbit.is_active = true
		AND rbit.institution_roles_id = 5
		AND (
				rbit.institution_roles_id IS NULL
				OR rbit.institution_types_id IS NULL
				OR (
						rbit.institution_types_id = 78
						AND (
								NOT valid_text(rbit.other_institution)
							)
					)
			);

	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;	

	SELECT
		COUNT(*) = 0
		INTO
		general_validation
	FROM result_ip_measure rim
	WHERE rim.result_id = resultId
		AND rim.is_active = TRUE
		AND (
				rim.unit_of_measure IS NULL
				OR rim.quantity IS NULL
			);
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;	
	
 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_knowledge_product_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_knowledge_product_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
  	SELECT 
  		IF(rkp.is_melia = 1,
			IF(rkp.melia_previous_submitted = 1,
				rkp.ost_melia_study_id IS NOT NULL AND 
				valid_text(rkp.ost_melia_study_id),
				rkp.melia_type_id IS NOT NULL AND 
				valid_text(rkp.melia_type_id)),
			IF(rkp.is_melia IS NOT NULL, TRUE, FALSE)) AND
		IF(rkp.knowledge_product_type LIKE '%journal%article%', 
				valid_text(cg_rkm.is_isi) AND 
				valid_text(cg_rkm.accesibility), 
				TRUE)
		INTO
  		general_validation
  	FROM
		result r
		LEFT JOIN results_knowledge_product rkp ON rkp.results_id = r.id
		LEFT JOIN results_kp_metadata cg_rkm ON cg_rkm.result_knowledge_product_id = rkp.result_knowledge_product_id
											AND cg_rkm.is_active AND cg_rkm.source LIKE '%cgspace%'
	WHERE
		r.id = resultId
		AND r.is_active = TRUE;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_link_result_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_link_result_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
 	RETURN TRUE;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_partners_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_partners_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
  	DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
  	DECLARE result_id BIGINT DEFAULT NULL;
  	DECLARE count_institutions BIGINT DEFAULT 0;
  	DECLARE institutions_ids TEXT DEFAULT NULL;
  	DECLARE center_count_all BIGINT DEFAULT 0;
  	DECLARE center_count_leading BIGINT DEFAULT 0;
  	DECLARE institutions_count_leading BIGINT DEFAULT 0;
  	
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
		WHEN (
				SELECT
					CASE
						#if there are not non-pooled, we consider this as valid
						WHEN IFNULL(COUNT(npp.id),0) = 0 THEN 1
						#if the difference between the number of valid non-pooled and the total number is 0, then this is valid
						ELSE (
							IFNULL(
								SUM(
									IF(
										(
											npp.funder_institution_id IS NOT NULL AND npp.funder_institution_id > 0 AND
											COALESCE(npp.grant_title, '') <> '' AND COALESCE(npp.lead_center_id, '') <> ''
										),
										1, 0
									)
								),
								0
							) - IFNULL(COUNT(npp.id), 0) = 0
						)
					END as npp_validation
				FROM
					non_pooled_project npp
				WHERE
					npp.results_id = resultId
					AND npp.is_active > 0
			) = 0 THEN FALSE
	  	ELSE TRUE
	END;
END`);

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_policy_change_P22\``,
    );
    await queryRunner.query(`CREATE FUNCTION \`validation_policy_change_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	
  	SELECT 
  		valid_text(rpc.policy_type_id) AND
  		valid_text(rpc.policy_stage_id)
  		INTO
  		general_validation
  	FROM result r
		LEFT JOIN results_policy_changes rpc ON rpc.result_id = r.id
											AND rpc.is_active = TRUE
	WHERE r.id = resultId
		AND r.is_active = TRUE;
		
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	SELECT
		COUNT(*) > 0
		INTO
  		general_validation
	FROM result_answers ra
	WHERE ra.result_id = resultId
		AND ra.is_active = TRUE
		AND ra.answer_boolean = TRUE;
	
	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

	SELECT
		count(rbi.id) > 0
		INTO
  		general_validation
	FROM results_by_institution rbi
	WHERE rbi.result_id = resultId
		AND rbi.institution_roles_id = 4
		AND rbi.is_active = TRUE;

	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
 	RETURN TRUE;
END`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS \`validation_toc_P22\``);
    await queryRunner.query(`CREATE FUNCTION \`validation_toc_P22\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE result_level BIGINT DEFAULT NULL;
  	DECLARE initative BIGINT DEFAULT NULL;
  	
  	SELECT 	
  		r.result_level_id,
  		rbi.inititiative_id
  		INTO
  		result_level,
  		initative
  	FROM \`result\` r 
  	INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id AND rbi.initiative_role_id = 1
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
  	IF ( result_level IS NULL ) THEN RETURN FALSE; END IF;
  	
  	IF ( result_level NOT IN (1, 2) ) THEN 
  	
	  	SELECT 
			SUM(IF(rtr.planned_result IS NULL, 0, 1)) = SUM(IF(rtr.toc_result_id IS NOT NULL, 1, 0))
			INTO
			general_validation
		FROM results_toc_result rtr
		WHERE rtr.results_id = resultId
			AND rtr.is_active = TRUE;
	  	
	  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
	  	SELECT 
	  		IF(COUNT(rtr.toc_result_id IS NOT NULL) = 0, 0, 1) = 1
	  		INTO
	  		general_validation
		FROM results_toc_result rtr
		WHERE rtr.initiative_id IN (initative)
			AND rtr.results_id = resultId
			AND rtr.toc_result_id IS NOT NULL
			AND rtr.is_active = TRUE;
	  	
	  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
	
		SELECT 
			IFNULL((
					SELECT COUNT(DISTINCT rtr.initiative_id)
					FROM results_toc_result rtr
					WHERE rtr.initiative_id NOT IN (initative)
						AND rtr.results_id = resultId
						AND rtr.is_active = TRUE
						AND rtr.toc_result_id IS NOT NULL
						), 0) =
			(SELECT COUNT(rbi.id)
			FROM results_by_inititiative rbi
			WHERE rbi.result_id = resultId
				AND rbi.initiative_role_id = 2
				AND rbi.is_active = TRUE)
			INTO
	  		general_validation;
		
		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	IF ( result_level = 1 ) THEN
  	
  		SELECT 
			COUNT(DISTINCT cgt.impactAreaId) < 5
			INTO
	  		general_validation
		FROM results_impact_area_target riat
			INNER JOIN clarisa_global_targets cgt ON cgt.targetId = riat.impact_area_target_id
		WHERE riat.result_id = resultId
			AND riat.impact_area_target_id IS NULL
			AND riat.is_active = TRUE;
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

  		SELECT 
			COUNT(DISTINCT ciai.impact_area_id) < 5
			INTO
			general_validation
		FROM results_impact_area_indicators riai
			INNER JOIN clarisa_impact_area_indicator ciai ON ciai.id = riai.impact_area_indicator_id
		WHERE riai.result_id = resultId
			AND riai.impact_area_indicator_id IS NULL
			AND riai.is_active = TRUE;
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
 	RETURN TRUE;
END`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`validate_sections_mapped_batch\``,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_capacity_dev_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_evidences_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_general_information_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_geo_location_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_innovation_dev_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_innovation_use_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_knowledge_product_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_link_result_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_partners_P22\``,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS \`validation_policy_change_P22\``,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`validation_toc_P22\``);
  }
}
