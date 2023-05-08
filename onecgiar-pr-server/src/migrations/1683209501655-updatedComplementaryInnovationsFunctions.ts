import { MigrationInterface, QueryRunner } from "typeorm"

export class updatedComplementaryInnovationsFunctions1683209501655 implements MigrationInterface {
    name: 'updatedComplementaryInnovationsFunctions1683209501655';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves beneficiary/ user awareness of the core innovation'
        WHERE
            complementary_innovation_functions_id = 1;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves beneficiary/ user confidence/ trust in core innovation'
        WHERE
            complementary_innovation_functions_id = 2;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves availability and beneficiary/ user access to core innovation'
        WHERE
            complementary_innovation_functions_id = 3;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves beneficiary/ user access to finance/ affordability of the core innovation'
        WHERE
            complementary_innovation_functions_id = 4;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves compatibility of core innovation with existing farming/ market/ policy systems or business models'
        WHERE
            complementary_innovation_functions_id = 5;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves beneficiary/ user capacity and knowhow to appropriately use the core innovation'
        WHERE
            complementary_innovation_functions_id = 6;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves gender equality and social inclusion related to scaling the core innovation'
        WHERE
            complementary_innovation_functions_id = 7;`);

        await queryRunner.query(`
        UPDATE
            complementary_innovation_functions
        SET
            name = 'Improves legal conditions and governance required to scale the core innovation (by-laws, policies, regulations and business models)'
        WHERE
            complementary_innovation_functions_id = 8;`);

        await queryRunner.query(`
        INSERT INTO
                complementary_innovation_functions (name)
        VALUES
                (
                    'Improves stakeholder coordination and scaling partnerships'
                );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
