import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorEvidencesv21667489259810 implements MigrationInterface {
    name = 'refactorEvidencesv21667489259810'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`status\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`status\` tinyint NULL`);
    }

}
