import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCheckBooleanEvidenceTable1761850833156 implements MigrationInterface {
    name = 'AddCheckBooleanEvidenceTable1761850833156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`innov_dev_user_demand\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`innov_dev_user_demand\``);
    }

}
