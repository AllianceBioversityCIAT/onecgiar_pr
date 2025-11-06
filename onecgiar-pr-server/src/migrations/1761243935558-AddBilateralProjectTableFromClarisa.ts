import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBilateralProjectTableFromClarisa1761243935558 implements MigrationInterface {
    name = 'AddBilateralProjectTableFromClarisa1761243935558'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_projects\` (\`id\` bigint NOT NULL, \`short_name\` text NOT NULL, \`full_name\` text NOT NULL, \`summary\` text NULL, \`description\` text NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`total_budget\` decimal(18,2) NULL, \`remaining\` decimal(18,2) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` ADD CONSTRAINT \`FK_e00b1fd1d2b6f44689b09a3b111\` FOREIGN KEY (\`project_id\`) REFERENCES \`clarisa_projects\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` DROP FOREIGN KEY \`FK_e00b1fd1d2b6f44689b09a3b111\``);
        await queryRunner.query(`DROP TABLE \`clarisa_projects\``);
    }

}
