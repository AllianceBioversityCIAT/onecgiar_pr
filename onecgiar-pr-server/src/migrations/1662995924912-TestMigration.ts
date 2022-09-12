import { MigrationInterface, QueryRunner } from "typeorm";

export class TestMigration1662995924912 implements MigrationInterface {
    name = 'TestMigration1662995924912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`active\` \`active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`role\` CHANGE \`active\` \`active\` tinyint NOT NULL`);
    }

}
