import { MigrationInterface, QueryRunner } from "typeorm";

export class HasScalingStudiesInnovUse1761542184349 implements MigrationInterface {
    name = 'HasScalingStudiesInnovUse1761542184349'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_scaling_study_urls\` (\`id\` int NOT NULL AUTO_INCREMENT, \`result_innov_use_id\` int NOT NULL, \`study_url\` text NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`has_scaling_studies\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`readiness_level_explanation\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_cad5e7bd1b507cad83709dc4085\` FOREIGN KEY (\`result_innov_use_id\`) REFERENCES \`results_innovations_use\`(\`result_innovation_use_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_f4af4ec19c0e1e62815d5470440\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_596ce53bd471ec53b7908cc82a1\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_596ce53bd471ec53b7908cc82a1\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_f4af4ec19c0e1e62815d5470440\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_cad5e7bd1b507cad83709dc4085\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`readiness_level_explanation\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`has_scaling_studies\``);
        await queryRunner.query(`DROP TABLE \`result_scaling_study_urls\``);
    }

}
