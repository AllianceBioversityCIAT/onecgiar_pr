import { MigrationInterface, QueryRunner } from "typeorm";

export class TestMigration1662999197343 implements MigrationInterface {
    name = 'TestMigration1662999197343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`active\` \`active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles_user_by_aplication\` CHANGE \`active\` \`active\` tinyint NOT NULL`);
    }

}
