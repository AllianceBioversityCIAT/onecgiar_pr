import { MigrationInterface, QueryRunner } from "typeorm";

export class isKrsNull1666646040861 implements MigrationInterface {
    name = 'isKrsNull1666646040861'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NULL`);
        await queryRunner.query(`update \`result\` set is_krs = null;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`is_krs\` \`is_krs\` tinyint NULL DEFAULT '0'`);
    }

}
