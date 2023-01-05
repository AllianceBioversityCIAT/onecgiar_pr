import { MigrationInterface, QueryRunner } from "typeorm"

export class udateResultCode1672862893586 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`update \`result\` set result_code = id`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
