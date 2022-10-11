import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultByInstitutions1665510228451 implements MigrationInterface {
    name = 'refactorResultByInstitutions1665510228451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`results_by_institution\` (\`results_id\` bigint NOT NULL AUTO_INCREMENT, \`institutions_id\` int NOT NULL, \`institution_roles_id\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`results_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_030b9938e0e50a182205ba0d322\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_73cf3e6ca5a84f6fb065860b4dd\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_141eb58a1a014a850a97ce518ef\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_141eb58a1a014a850a97ce518ef\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_73cf3e6ca5a84f6fb065860b4dd\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_030b9938e0e50a182205ba0d322\``);
        await queryRunner.query(`DROP TABLE \`results_by_institution\``);
    }

}
