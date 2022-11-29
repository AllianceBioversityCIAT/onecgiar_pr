import { MigrationInterface, QueryRunner } from "typeorm";

export class GeoScopes1666987500165 implements MigrationInterface {
    name = 'GeoScopes1666987500165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_geographic_scope\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_region\` (\`result_region_id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`region_id\` int NULL, \`result_id\` bigint NULL, PRIMARY KEY (\`result_region_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`geographic_scope_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c02a8848d0317d55d1bd882833e\` FOREIGN KEY (\`geographic_scope_id\`) REFERENCES \`clarisa_geographic_scope\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD CONSTRAINT \`FK_179b0a95bafbd47c9dd8e8e15a4\` FOREIGN KEY (\`region_id\`) REFERENCES \`clarisa_regions\`(\`um49Code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD CONSTRAINT \`FK_a3ee6ce630f4784e2e93301bbdd\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP FOREIGN KEY \`FK_a3ee6ce630f4784e2e93301bbdd\``);
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP FOREIGN KEY \`FK_179b0a95bafbd47c9dd8e8e15a4\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c02a8848d0317d55d1bd882833e\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`geographic_scope_id\``);
        await queryRunner.query(`DROP TABLE \`result_region\``);
        await queryRunner.query(`DROP TABLE \`clarisa_geographic_scope\``);
    }

}
