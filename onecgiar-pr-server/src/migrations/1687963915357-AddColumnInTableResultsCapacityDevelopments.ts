import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnInTableResultsCapacityDevelopments1687963915357 implements MigrationInterface {
    name = 'AddColumnInTableResultsCapacityDevelopments1687963915357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`is_attending_for_organization\` tinyint NULL`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`is_attending_for_organization\``);
    }

}
