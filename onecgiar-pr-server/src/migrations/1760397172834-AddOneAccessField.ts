import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOneAccessField1760397172834 implements MigrationInterface {
    name = 'AddOneAccessField1760397172834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` ADD \`open_access\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_metadata\` DROP COLUMN \`open_access\``);

    }

}
