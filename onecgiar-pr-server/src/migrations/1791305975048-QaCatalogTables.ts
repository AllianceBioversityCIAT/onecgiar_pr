// @akili-spec quality-assurance/qa-field-catalog
import { MigrationInterface, QueryRunner } from "typeorm";

export class QaCatalogTables1791305975048 implements MigrationInterface {
    name = 'QaCatalogTables1791305975048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`qa_catalog_version\` (\`phase_year\` int NOT NULL, \`portfolio\` varchar(255) NOT NULL, \`revision\` int NOT NULL DEFAULT '1', \`content_hash\` varchar(64) NOT NULL, \`synced_at\` timestamp NULL, PRIMARY KEY (\`phase_year\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`qa_catalog_result_type\` (\`key\` varchar(255) NOT NULL, \`label\` varchar(255) NOT NULL, \`level\` varchar(255) NULL, PRIMARY KEY (\`key\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`qa_catalog_field\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`parent_key\` varchar(255) NOT NULL DEFAULT '', \`label\` varchar(255) NOT NULL, \`description\` text NULL, \`type\` varchar(255) NOT NULL, \`control_list\` varchar(255) NULL, \`section_key\` varchar(255) NULL, \`order\` int NOT NULL DEFAULT '0', \`result_types\` json NULL, \`required\` tinyint NOT NULL DEFAULT 0, \`required_confirmed\` tinyint NOT NULL DEFAULT 0, \`required_when\` json NULL, \`valid_from\` int NOT NULL, \`valid_to\` int NULL, \`storage\` json NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_qa_catalog_field_key_parent\` (\`key\`, \`parent_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`qa_catalog_section\` (\`key\` varchar(255) NOT NULL, \`label\` varchar(255) NOT NULL, \`order\` int NOT NULL DEFAULT '0', \`result_types\` json NULL, \`valid_from\` int NOT NULL, \`valid_to\` int NULL, PRIMARY KEY (\`key\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`qa_catalog_section\``);
        await queryRunner.query(`DROP INDEX \`IDX_qa_catalog_field_key_parent\` ON \`qa_catalog_field\``);
        await queryRunner.query(`DROP TABLE \`qa_catalog_field\``);
        await queryRunner.query(`DROP TABLE \`qa_catalog_result_type\``);
        await queryRunner.query(`DROP TABLE \`qa_catalog_version\``);
    }

}
