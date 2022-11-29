import { MigrationInterface, QueryRunner } from "typeorm";

export class applicablePartner1666901037325 implements MigrationInterface {
    name = 'applicablePartner1666901037325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`applicable_partner\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`applicable_partner\``);
    }

}
