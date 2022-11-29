import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInnovationUse1668721326655 implements MigrationInterface {
    name = 'refactorInnovationUse1668721326655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` CHANGE \`result_innovations_use_measure_id\` \`result_innovation_use_id\` int NOT NULL AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` CHANGE \`result_innovation_use_id\` \`result_innovations_use_measure_id\` int NOT NULL AUTO_INCREMENT`);
    }

}
