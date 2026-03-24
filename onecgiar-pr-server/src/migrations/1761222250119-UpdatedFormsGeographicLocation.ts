import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedFormsGeographicLocation1761222250119 implements MigrationInterface {
    name = 'UpdatedFormsGeographicLocation1761222250119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`geo_scope_role\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD \`geo_scope_role_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_country_subnational\` ADD \`geo_scope_role_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD \`geo_scope_role_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`extra_geo_scope_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`has_extra_regions\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`has_extra_countries\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_region\` ADD CONSTRAINT \`FK_980e523e80613d2e0f237677889\` FOREIGN KEY (\`geo_scope_role_id\`) REFERENCES \`geo_scope_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_country_subnational\` ADD CONSTRAINT \`FK_46a677c78910cbb1792559077f3\` FOREIGN KEY (\`geo_scope_role_id\`) REFERENCES \`geo_scope_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD CONSTRAINT \`FK_a8819faeb0efa25a1ddf777d8cc\` FOREIGN KEY (\`geo_scope_role_id\`) REFERENCES \`geo_scope_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_2e6df7e2192561924793eb15c3b\` FOREIGN KEY (\`extra_geo_scope_id\`) REFERENCES \`clarisa_geographic_scope\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO \`geo_scope_role\` (\`name\`, \`is_active\`)
            VALUES 
                ('Main', 1),
                ('Extra', 1)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_2e6df7e2192561924793eb15c3b\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP FOREIGN KEY \`FK_a8819faeb0efa25a1ddf777d8cc\``);
        await queryRunner.query(`ALTER TABLE \`result_country_subnational\` DROP FOREIGN KEY \`FK_46a677c78910cbb1792559077f3\``);
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP FOREIGN KEY \`FK_980e523e80613d2e0f237677889\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`has_extra_countries\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`has_extra_regions\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`extra_geo_scope_id\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP COLUMN \`geo_scope_role_id\``);
        await queryRunner.query(`ALTER TABLE \`result_country_subnational\` DROP COLUMN \`geo_scope_role_id\``);
        await queryRunner.query(`ALTER TABLE \`result_region\` DROP COLUMN \`geo_scope_role_id\``);
        await queryRunner.query(`DROP TABLE \`geo_scope_role\``);
    }

}
