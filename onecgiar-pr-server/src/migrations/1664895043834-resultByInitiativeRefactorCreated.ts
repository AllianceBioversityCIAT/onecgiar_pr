import { MigrationInterface, QueryRunner } from "typeorm";

export class resultByInitiativeRefactorCreated1664895043834 implements MigrationInterface {
    name = 'resultByInitiativeRefactorCreated1664895043834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`results_by_inititiative\` (\`id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_id\` bigint NULL, \`inititiative_id\` int NULL, \`initiative_role_id\` bigint NOT NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_187203882c6f8671264095a7d3a\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_723458a75bfd10519517d9b2bf3\` FOREIGN KEY (\`inititiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_4e113ec11bf1911212375ec5e9f\` FOREIGN KEY (\`initiative_role_id\`) REFERENCES \`initiative_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_64714f53816392407e30ec0aa6f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_a4bb5660ef58c4236560192df90\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_fb24d9cfa00e2e2ead619a61dd0\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_fb24d9cfa00e2e2ead619a61dd0\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_a4bb5660ef58c4236560192df90\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_64714f53816392407e30ec0aa6f\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_4e113ec11bf1911212375ec5e9f\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_723458a75bfd10519517d9b2bf3\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_187203882c6f8671264095a7d3a\``);
        await queryRunner.query(`DROP TABLE \`results_by_inititiative\``);
    }

}
