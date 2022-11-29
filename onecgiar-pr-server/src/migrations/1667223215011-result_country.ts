import { MigrationInterface, QueryRunner } from "typeorm";

export class resultCountry1667223215011 implements MigrationInterface {
    name = 'resultCountry1667223215011'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_country\` (\`result_country_id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_id\` bigint NULL, \`country_id\` int NULL, PRIMARY KEY (\`result_country_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD CONSTRAINT \`FK_55dcfdceaaeba551d8c64367649\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD CONSTRAINT \`FK_acf6398f5385e732a74607f338a\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP FOREIGN KEY \`FK_acf6398f5385e732a74607f338a\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP FOREIGN KEY \`FK_55dcfdceaaeba551d8c64367649\``);
        await queryRunner.query(`DROP TABLE \`result_country\``);
    }

}
