import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateOldDataImpactAreaScore1769005245551 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO result_impact_area_score (result_id, impact_area_score_id)
(select temp.id, temp.impact_area_score_id
from (SELECT r.id, r.gender_impact_area_id as impact_area_score_id
FROM result r
WHERE r.is_active = true
	AND r.gender_impact_area_id is not null
	AND r.gender_tag_level_id = 3
union	
SELECT r.id, r.climate_impact_area_id as impact_area_score_id
FROM result r
WHERE r.is_active = true
	AND r.climate_impact_area_id is not null
	AND r.climate_change_tag_level_id = 3
union		
SELECT r.id, r.nutrition_impact_area_id as impact_area_score_id
FROM result r
WHERE r.is_active = true
	AND r.nutrition_impact_area_id is not null
	AND r.nutrition_tag_level_id = 3
union	
SELECT r.id, r.environmental_biodiversity_impact_area_id as impact_area_score_id 
FROM result r
WHERE r.is_active = true
	AND r.environmental_biodiversity_impact_area_id is not null
	AND r.environmental_biodiversity_tag_level_id = 3
union	
SELECT r.id, r.poverty_impact_area_id as impact_area_score_id 
FROM result r
WHERE r.is_active = true
	AND r.poverty_impact_area_id is not null
	AND r.poverty_tag_level_id  = 3) temp)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM result_impact_area_score`);
    }

}
