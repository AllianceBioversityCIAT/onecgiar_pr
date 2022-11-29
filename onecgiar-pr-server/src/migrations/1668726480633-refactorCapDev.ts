import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorCapDev1668726480633 implements MigrationInterface {
    name = 'refactorCapDev1668726480633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` CHANGE \`result_capacity_developent_id\` \`result_capacity_development_id\` int NOT NULL AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` CHANGE \`result_capacity_development_id\` \`result_capacity_developent_id\` int NOT NULL AUTO_INCREMENT`);
    }

}
