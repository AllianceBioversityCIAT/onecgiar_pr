import { MigrationInterface, QueryRunner } from "typeorm";

export class createSubNationalTable1682462569643 implements MigrationInterface {
    name = 'createSubNationalTable1682462569643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_countries_sub_national\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_countries_sub_national_id\` bigint NOT NULL AUTO_INCREMENT, \`result_countries_id\` bigint NOT NULL, \`sub_level_one_id\` bigint NULL, \`sub_level_one_name\` text NULL, \`sub_level_two_id\` bigint NULL, \`sub_level_two_name\` text NULL, PRIMARY KEY (\`result_countries_sub_national_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_countries_sub_national\` ADD CONSTRAINT \`FK_f894dd63a231151315486814424\` FOREIGN KEY (\`result_countries_id\`) REFERENCES \`result_country\`(\`result_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_countries_sub_national\` ADD CONSTRAINT \`FK_c01ebd6213f7ee1c06ff28c7a1a\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_countries_sub_national\` DROP FOREIGN KEY \`FK_c01ebd6213f7ee1c06ff28c7a1a\``);
        await queryRunner.query(`ALTER TABLE \`result_countries_sub_national\` DROP FOREIGN KEY \`FK_f894dd63a231151315486814424\``);
        await queryRunner.query(`DROP TABLE \`result_countries_sub_national\``);
    }

}
