import { MigrationInterface, QueryRunner } from "typeorm";

export class legacyResults1665671818694 implements MigrationInterface {
    name = 'legacyResults1665671818694'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`legacy_result\` (\`indicator_type\` text NULL, \`year\` int NULL, \`crp\` text NULL, \`legacy_id\` varchar(45) NOT NULL, \`title\` text NULL, \`description\` text NULL, \`geo_scope\` text NULL, \`detail_link\` text NULL, \`is_migrated\` tinyint NULL, PRIMARY KEY (\`legacy_id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`legacy_result\``);
    }

}
