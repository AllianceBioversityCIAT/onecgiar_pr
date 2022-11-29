import { MigrationInterface, QueryRunner } from "typeorm";

export class resultCountry1667220276486 implements MigrationInterface {
    name = 'resultCountry1667220276486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result-country\` (\`result_country_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NULL, \`country_id\` int NULL, PRIMARY KEY (\`result_country_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result-country\` ADD CONSTRAINT \`FK_548af49211867639f96a0267f4f\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result-country\` ADD CONSTRAINT \`FK_8d6860589e9b9968306b0f3316e\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result-country\` DROP FOREIGN KEY \`FK_8d6860589e9b9968306b0f3316e\``);
        await queryRunner.query(`ALTER TABLE \`result-country\` DROP FOREIGN KEY \`FK_548af49211867639f96a0267f4f\``);
        await queryRunner.query(`DROP TABLE \`result-country\``);
    }

}
