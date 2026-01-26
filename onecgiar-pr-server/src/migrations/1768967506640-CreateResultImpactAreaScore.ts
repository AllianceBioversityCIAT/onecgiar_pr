import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateResultImpactAreaScore1768967506640 implements MigrationInterface {
    name = 'CreateResultImpactAreaScore1768967506640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_impact_area_score\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`impact_area_score_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_impact_area_score\` ADD CONSTRAINT \`FK_43a5ecc96ee94cbcebe59dc0b6f\` FOREIGN KEY (\`impact_area_score_id\`) REFERENCES \`impact_areas_scores_components\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_impact_area_score\` ADD CONSTRAINT \`FK_ff50d933e6d317e823a1c8baddf\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_impact_area_score\` DROP FOREIGN KEY \`FK_ff50d933e6d317e823a1c8baddf\``);
        await queryRunner.query(`ALTER TABLE \`result_impact_area_score\` DROP FOREIGN KEY \`FK_43a5ecc96ee94cbcebe59dc0b6f\``);
        await queryRunner.query(`DROP TABLE \`result_impact_area_score\``);
    }

}
