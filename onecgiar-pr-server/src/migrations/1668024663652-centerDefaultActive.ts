import { MigrationInterface, QueryRunner } from "typeorm";

export class centerDefaultActive1668024663652 implements MigrationInterface {
    name = 'centerDefaultActive1668024663652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` CHANGE \`is_active\` \`is_active\` tinyint NOT NULL`);
    }

}
