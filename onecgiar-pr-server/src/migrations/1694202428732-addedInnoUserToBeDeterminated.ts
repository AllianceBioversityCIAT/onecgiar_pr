import { MigrationInterface, QueryRunner } from "typeorm";

export class addedInnoUserToBeDeterminated1694202428732 implements MigrationInterface {
    name = 'addedInnoUserToBeDeterminated1694202428732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_user_to_be_determined\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_user_to_be_determined\``);
    }

}
