import { MigrationInterface, QueryRunner } from "typeorm";

export class activeDefaultTrue1668000560878 implements MigrationInterface {
    name = 'activeDefaultTrue1668000560878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`);
    }

}
