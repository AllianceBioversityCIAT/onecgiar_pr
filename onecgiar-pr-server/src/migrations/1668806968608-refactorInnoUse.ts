import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInnoUse1668806968608 implements MigrationInterface {
    name = 'refactorInnoUse1668806968608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` CHANGE \`quantity\` \`quantity\` float NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` CHANGE \`quantity\` \`quantity\` float NOT NULL`);
    }

}
