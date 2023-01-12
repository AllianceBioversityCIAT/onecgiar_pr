import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBiTable1673550914985 implements MigrationInterface {
    name = 'CreateBiTable1673550914985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`bi_reports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`report_name\` varchar(30) NULL, \`report_title\` varchar(100) NULL, \`report_description\` varchar(140) NULL, \`report_id\` text NULL, \`dataset_id\` text NULL, \`group_id\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`has_rls_security\` tinyint NOT NULL DEFAULT 1, \`report_order\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`is_active\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`is_active\` tinyint NOT NULL DEFAULT '1'`);
        await queryRunner.query(`DROP TABLE \`bi_reports\``);
    }

}
