import { MigrationInterface, QueryRunner } from "typeorm";

export class createdBiSubpagesTable1707487857434 implements MigrationInterface {
    name = 'createdBiSubpagesTable1707487857434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`bi_subpages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`report_name\` varchar(30) NULL, \`section_number\` text NOT NULL, \`section_name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`bi_subpages\``);
    }

}
