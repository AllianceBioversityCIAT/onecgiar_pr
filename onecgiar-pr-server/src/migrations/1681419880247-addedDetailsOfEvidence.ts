import { MigrationInterface, QueryRunner } from "typeorm";

export class addedDetailsOfEvidence1681419880247 implements MigrationInterface {
    name = 'addedDetailsOfEvidence1681419880247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`details_of_evidence\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`details_of_evidence\``);
    }

}
