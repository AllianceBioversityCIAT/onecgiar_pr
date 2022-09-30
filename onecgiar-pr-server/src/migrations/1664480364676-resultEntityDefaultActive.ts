import { MigrationInterface, QueryRunner } from "typeorm";

export class resultEntityDefaultActive1664480364676 implements MigrationInterface {
    name = 'resultEntityDefaultActive1664480364676'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`);
    }

}
