import { MigrationInterface, QueryRunner } from "typeorm";

export class addedIsPublished1681487423524 implements MigrationInterface {
    name = 'addedIsPublished1681487423524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`is_result_ip_published\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`is_result_ip_published\``);
    }

}
