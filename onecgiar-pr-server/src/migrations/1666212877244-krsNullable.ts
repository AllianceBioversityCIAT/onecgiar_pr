import { MigrationInterface, QueryRunner } from "typeorm";

export class krsNullable1666212877244 implements MigrationInterface {
    name = 'krsNullable1666212877244'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NOT NULL DEFAULT '0'`);
    }

}
