import { MigrationInterface, QueryRunner } from "typeorm"

export class insertControlList1683298394638 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO clarisa_innovation_use_levels (level, name) VALUES 
        (0,'Innovation is not used.'),
        (1,'Innovation is used by organization(s) leading the innovation development.'),
        (2,'Innovation is used by some partners involved in initial innovation development.'),
        (3,'Innovation is commonly used by partners involved in initial innovation development.'),
        (4,'Innovation is used by some organizations connected to partners involved in the initial innovation development.'),
        (5,'Innovation is commonly used by organizations connected to partners involved in the initial innovation development.'),
        (6,'Innovation is used by organizations not connected to partners involved in the initial innovation development.'),
        (7,'Innovation is commonly used by organizations not connected to partners involved in the initial innovation development.'),
        (8,'Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development.'),
        (9,'Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development.');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
