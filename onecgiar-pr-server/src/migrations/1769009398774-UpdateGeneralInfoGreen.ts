import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGeneralInfoGreen1769009398774 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS \`validation_general_information_P25\``);
        await queryRunner.query(`CREATE FUNCTION \`validation_general_information_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  	DECLARE gender_tag_level_id BIGINT DEFAULT NULL;
  	DECLARE climate_change_tag_level_id BIGINT DEFAULT NULL;
	DECLARE nutrition_tag_level_id BIGINT DEFAULT NULL;
	DECLARE environmental_biodiversity_tag_level_id BIGINT DEFAULT NULL;
	DECLARE poverty_tag_level_id BIGINT DEFAULT NULL;

  
  	SELECT 
  		valid_text(r.title) AND
  		valid_text(r.gender_tag_level_id) AND 
  		r.gender_tag_level_id IS NOT NULL AND
  		valid_text(r.climate_change_tag_level_id) AND
  		r.climate_change_tag_level_id IS NOT NULL AND
  		valid_text(r.nutrition_tag_level_id) AND
  		r.nutrition_tag_level_id IS NOT NULL AND
  		valid_text(r.environmental_biodiversity_tag_level_id) AND
  		r.environmental_biodiversity_tag_level_id IS NOT NULL AND
  		valid_text(r.poverty_tag_level_id)  AND
  		r.poverty_tag_level_id IS NOT NULL AND
  		IF(r.result_type_id <> 6, valid_text(r.description), TRUE),
  		r.gender_tag_level_id,
  		r.climate_change_tag_level_id,
  		r.nutrition_tag_level_id,
  		r.environmental_biodiversity_tag_level_id,
  		r.poverty_tag_level_id
  		INTO
  		general_validation,
  		gender_tag_level_id,
  		climate_change_tag_level_id,
  		nutrition_tag_level_id,
  		environmental_biodiversity_tag_level_id,
  		poverty_tag_level_id
  	FROM \`result\` r 
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
  	IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	IF gender_tag_level_id = 3 THEN
  	
  		SELECT 
  			COUNT(rias.id) > 0
  			INTO
  			general_validation
  		FROM result_impact_area_score rias 
  			INNER JOIN impact_areas_scores_components iasc ON rias.impact_area_score_id = iasc.id 
  		WHERE rias.result_id = resultId
  			AND rias.is_active = true
  			AND iasc.impact_area = 'Gender';
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	IF climate_change_tag_level_id = 3 THEN
  	
  		SELECT 
  			COUNT(rias.id) > 0
  			INTO
  			general_validation
  		FROM result_impact_area_score rias 
  			INNER JOIN impact_areas_scores_components iasc ON rias.impact_area_score_id = iasc.id 
  		WHERE rias.result_id = resultId
  			AND rias.is_active = true
  			AND iasc.impact_area = 'Climate';
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	IF nutrition_tag_level_id = 3 THEN
  	
  		SELECT 
  			COUNT(rias.id) > 0
  			INTO
  			general_validation
  		FROM result_impact_area_score rias 
  			INNER JOIN impact_areas_scores_components iasc ON rias.impact_area_score_id = iasc.id 
  		WHERE rias.result_id = resultId
  			AND rias.is_active = true
  			AND iasc.impact_area = 'Nutrition';
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	IF environmental_biodiversity_tag_level_id = 3 THEN
  	
  		SELECT 
  			COUNT(rias.id) > 0
  			INTO
  			general_validation
  		FROM result_impact_area_score rias 
  			INNER JOIN impact_areas_scores_components iasc ON rias.impact_area_score_id = iasc.id 
  		WHERE rias.result_id = resultId
  			AND rias.is_active = true
  			AND iasc.impact_area = 'Environmental';
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	IF poverty_tag_level_id = 3 THEN
  	
  		SELECT 
  			COUNT(rias.id) > 0
  			INTO
  			general_validation
  		FROM result_impact_area_score rias 
  			INNER JOIN impact_areas_scores_components iasc ON rias.impact_area_score_id = iasc.id 
  		WHERE rias.result_id = resultId
  			AND rias.is_active = true
  			AND iasc.impact_area = 'Poverty';
  		
  		IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
  	
  	END IF;
  	
  	
 	RETURN general_validation;
END`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS \`validation_general_information_P25\``);
        await queryRunner.query(`CREATE FUNCTION \`validation_general_information_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
	
  	DECLARE general_validation BOOLEAN DEFAULT TRUE;
  
  	SELECT 
  		valid_text(r.title) AND
  		valid_text(r.gender_tag_level_id) AND 
  		IF(r.gender_tag_level_id = 3, r.gender_impact_area_id IS NOT NULL, TRUE) AND
  		valid_text(r.climate_change_tag_level_id) AND
  		IF(r.climate_change_tag_level_id = 3, r.climate_impact_area_id IS NOT NULL, TRUE) AND
  		valid_text(r.nutrition_tag_level_id) AND
  		IF(r.nutrition_tag_level_id = 3, r.nutrition_impact_area_id IS NOT NULL, TRUE) AND
  		valid_text(r.environmental_biodiversity_tag_level_id) AND
  		IF(r.environmental_biodiversity_tag_level_id = 3, r.environmental_biodiversity_impact_area_id IS NOT NULL, TRUE) AND
  		valid_text(r.poverty_tag_level_id)  AND
  		IF(r.poverty_tag_level_id = 3, r.poverty_impact_area_id IS NOT NULL, TRUE) AND
  		IF(r.result_type_id <> 6, valid_text(r.description), TRUE)
  		INTO
  		general_validation
  	FROM \`result\` r 
  	WHERE r.id = resultId
  		AND r.is_active = TRUE;
  	
 	RETURN general_validation;
END`);
    }

}
