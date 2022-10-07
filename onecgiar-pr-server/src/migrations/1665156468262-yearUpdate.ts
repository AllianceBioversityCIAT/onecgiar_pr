import { MigrationInterface, QueryRunner } from "typeorm"

export class yearUpdate1665156468262 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const year = await queryRunner.query(`INSERT IGNORE INTO \`year\` (year) VALUES ('2022')`);
        await queryRunner.query(`INSERT INTO \`year\` (year, active) VALUES (2023, 0) ON DUPLICATE KEY UPDATE active = 0;`);
        await queryRunner.query(`INSERT INTO \`year\` (year, active) VALUES (2024, 0) ON DUPLICATE KEY UPDATE active = 0;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
