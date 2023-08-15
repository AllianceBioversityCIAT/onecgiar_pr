import { MigrationInterface, QueryRunner } from "typeorm";

export class addedLevelColumnClarisaInnReadinessLevel1689177045702 implements MigrationInterface {
    name = 'addedLevelColumnClarisaInnReadinessLevel1689177045702'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_readiness_level\` ADD \`level\` bigint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_readiness_level\` DROP COLUMN \`level\``);
    }

}
