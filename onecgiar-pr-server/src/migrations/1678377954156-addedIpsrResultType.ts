import { MigrationInterface, QueryRunner } from "typeorm"

export class addedIpsrResultType1678377954156 implements MigrationInterface {
    name = 'addedIpsrResultType1678377954156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO result_type (id, name) VALUES(10, 'Innovation Use(IPSR)');`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
