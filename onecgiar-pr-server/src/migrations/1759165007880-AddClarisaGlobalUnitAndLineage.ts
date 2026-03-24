import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClarisaGlobalUnitAndLineage1759165007880 implements MigrationInterface {
    name = 'AddClarisaGlobalUnitAndLineage1759165007880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_global_unit_lineage\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`from_global_unit_id\` bigint NULL, \`to_global_unit_id\` bigint NOT NULL, \`relation_type\` enum ('MERGE', 'SPLIT', 'SUCCESSOR', 'NEW') NOT NULL, \`note\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_global_units\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`code\` varchar(80) NOT NULL, \`name\` text NULL, \`compose_code\` varchar(191) NOT NULL, \`year\` int NULL, \`short_name\` text NULL, \`acronym\` text NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`level\` int NOT NULL, \`entity_type_id\` bigint NULL, \`parent_id\` bigint NULL, \`portfolio_id\` int NULL, \`is_active\` TINYINT(1) NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_unit_lineage\` ADD CONSTRAINT \`FK_2ed43246e6d44248c37191ef4b2\` FOREIGN KEY (\`from_global_unit_id\`) REFERENCES \`clarisa_global_units\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_unit_lineage\` ADD CONSTRAINT \`FK_ec1abd75ef70a979872f01cf31d\` FOREIGN KEY (\`to_global_unit_id\`) REFERENCES \`clarisa_global_units\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` ADD CONSTRAINT \`FK_0b2e6f7b40b40d28459b0b07f2a\` FOREIGN KEY (\`entity_type_id\`) REFERENCES \`clarisa_cgiar_entity_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` ADD CONSTRAINT \`FK_f90b3f8b90420da5cbe9c77bdf5\` FOREIGN KEY (\`parent_id\`) REFERENCES \`clarisa_global_units\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` ADD CONSTRAINT \`FK_bed6b12ce70f2912623e99d8cc7\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`clarisa_portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` DROP FOREIGN KEY \`FK_bed6b12ce70f2912623e99d8cc7\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` DROP FOREIGN KEY \`FK_f90b3f8b90420da5cbe9c77bdf5\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_units\` DROP FOREIGN KEY \`FK_0b2e6f7b40b40d28459b0b07f2a\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_unit_lineage\` DROP FOREIGN KEY \`FK_ec1abd75ef70a979872f01cf31d\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_global_unit_lineage\` DROP FOREIGN KEY \`FK_2ed43246e6d44248c37191ef4b2\``);
        await queryRunner.query(`DROP TABLE \`clarisa_global_units\``);
        await queryRunner.query(`DROP TABLE \`clarisa_global_unit_lineage\``);
    }
}
