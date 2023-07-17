import { MigrationInterface, QueryRunner } from "typeorm";

export class addedScalingAmbitionBlurb1689623285660 implements MigrationInterface {
    name = 'addedScalingAmbitionBlurb1689623285660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`scaling_ambition_blurb\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`scaling_ambition_blurb\``);
    }

}
