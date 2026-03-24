import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorScalingStudiesInnoDev1761942047595 implements MigrationInterface {
    name = 'RefactorScalingStudiesInnoDev1761942047595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD \`result_innov_dev_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_cad5e7bd1b507cad83709dc4085\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` CHANGE \`result_innov_use_id\` \`result_innov_use_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_a73c86c6c33a52790ce2e8b9b36\` FOREIGN KEY (\`result_innov_dev_id\`) REFERENCES \`results_innovations_dev\`(\`result_innovation_dev_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_cad5e7bd1b507cad83709dc4085\` FOREIGN KEY (\`result_innov_use_id\`) REFERENCES \`results_innovations_use\`(\`result_innovation_use_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO \`evidence_types\` (\`name\`, \`description\`)
            VALUES ('user_need_inno_dev', 'Innovation dev evidence of user need/user demand');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_cad5e7bd1b507cad83709dc4085\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP FOREIGN KEY \`FK_a73c86c6c33a52790ce2e8b9b36\``);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` CHANGE \`result_innov_use_id\` \`result_innov_use_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` ADD CONSTRAINT \`FK_cad5e7bd1b507cad83709dc4085\` FOREIGN KEY (\`result_innov_use_id\`) REFERENCES \`results_innovations_use\`(\`result_innovation_use_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_scaling_study_urls\` DROP COLUMN \`result_innov_dev_id\``);
        await queryRunner.query(`
            DELETE FROM \`evidence_types\`
            WHERE \`name\` = 'user_need_inno_dev';
        `);
    }

}
