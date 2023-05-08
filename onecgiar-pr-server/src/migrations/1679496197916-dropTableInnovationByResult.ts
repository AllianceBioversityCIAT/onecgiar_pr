import { MigrationInterface, QueryRunner } from "typeorm"

export class dropTableInnovationByResult1679496197916 implements MigrationInterface {
    name = 'dropTableInnovationByResult1679496197916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS innovation_by_result;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
