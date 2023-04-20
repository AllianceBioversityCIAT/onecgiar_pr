import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorRKP1682019044423 implements MigrationInterface {
    name = 'refactorRKP1682019044423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE results_knowledge_product
            SET is_melia = FALSE
            WHERE is_melia is null;
        `);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` CHANGE \`is_melia\` \`is_melia\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` CHANGE \`is_melia\` \`is_melia\` tinyint NULL`);
    }

}
