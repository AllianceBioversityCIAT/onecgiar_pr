import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContributionToIndicatorTables1730929629367 implements MigrationInterface {
    name = 'AddContributionToIndicatorTables1730929629367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`contribution_to_indicators\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`toc_result_id\` varchar(255) NOT NULL, \`achieved_in_2024\` bigint NULL, \`narrative_achieved_in_2024\` text NULL, UNIQUE INDEX \`IDX_5ac195983e11c09df28f9efba4\` (\`toc_result_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`contribution_to_indicator_results\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`contribution_to_indicator_id\` int NOT NULL, \`result_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_results\` ADD CONSTRAINT \`FK_e9031d6f6f045909feb83658875\` FOREIGN KEY (\`contribution_to_indicator_id\`) REFERENCES \`contribution_to_indicators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_results\` ADD CONSTRAINT \`FK_261565558607cad5454848c3f1d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_results\` DROP FOREIGN KEY \`FK_261565558607cad5454848c3f1d\``);
        await queryRunner.query(`ALTER TABLE \`contribution_to_indicator_results\` DROP FOREIGN KEY \`FK_e9031d6f6f045909feb83658875\``);
        await queryRunner.query(`DROP TABLE \`contribution_to_indicator_results\``);
        await queryRunner.query(`DROP INDEX \`IDX_5ac195983e11c09df28f9efba4\` ON \`contribution_to_indicators\``);
        await queryRunner.query(`DROP TABLE \`contribution_to_indicators\``);
    }

}
