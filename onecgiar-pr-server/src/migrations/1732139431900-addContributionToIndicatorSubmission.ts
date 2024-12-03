import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContributionToIndicatorSubmission1732139431900 implements MigrationInterface {
    name = 'AddContributionToIndicatorSubmission1732139431900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`contribution_to_indicator_submissions\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`contribution_to_indicator_id\` int NOT NULL, \`user_id\` int NOT NULL, \`status_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` ADD CONSTRAINT \`FK_ed20bade92b2f8ef40b7c99695d\` FOREIGN KEY (\`contribution_to_indicator_id\`) REFERENCES \`contribution_to_indicators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` ADD CONSTRAINT \`FK_bcfd0d68ee1e59f8fe490cb7238\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` ADD CONSTRAINT \`FK_b113a039d9f4594f2383497b7cb\` FOREIGN KEY (\`status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` DROP FOREIGN KEY \`FK_b113a039d9f4594f2383497b7cb\``);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` DROP FOREIGN KEY \`FK_bcfd0d68ee1e59f8fe490cb7238\``);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_submissions\` DROP FOREIGN KEY \`FK_ed20bade92b2f8ef40b7c99695d\``);
        await queryRunner.query(`DROP TABLE \`contribution_to_indicator_submissions\``);
    }

}
