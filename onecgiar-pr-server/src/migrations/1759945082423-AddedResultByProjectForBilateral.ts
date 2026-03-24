import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedResultByProjectForBilateral1759945082423 implements MigrationInterface {
    name = 'AddedResultByProjectForBilateral1759945082423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`results_by_projects\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`project_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` ADD CONSTRAINT \`FK_3abb73e932b0a66d11bbd794f21\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` DROP FOREIGN KEY \`FK_3abb73e932b0a66d11bbd794f21\``);
        await queryRunner.query(`DROP TABLE \`results_by_projects\``);
    }

}
