import { MigrationInterface, QueryRunner } from "typeorm"

export class updatedExpertises1683143290472 implements MigrationInterface {
    name = 'updatedExpertises1683143290472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve beneficiary/ user awareness of the core innovation'
        WHERE
            expertises_id = 1;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve beneficiary/ user confidence/ trust in core innovation'
        WHERE
            expertises_id = 2;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve availability and beneficiary/ user access to core innovation'
        WHERE
            expertises_id = 3;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve beneficiary/ user access to finance/ affordability of the core innovation'
        WHERE
            expertises_id = 4;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve compatibility of core innovation with existing farming/ market/ policy systems or business models'
        WHERE
            expertises_id = 5;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve beneficiary/ user capacity and knowhow to appropriately use the core innovation'
        WHERE
            expertises_id = 6;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on gender equality and social inclusion related to scaling the core innovation'
        WHERE
            expertises_id = 7;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on legal conditions and governance required to scale the core innovation (by-laws, policies, regulations and business models)'
        WHERE
            expertises_id = 8;`);

        await queryRunner.query(`
        UPDATE
            expertises
        SET
            name = 'Expert on how to improve stakeholder coordination and scaling partnerships'
        WHERE
            expertises_id = 9;`);

        await queryRunner.query(`
        INSERT INTO
            expertises (name)
        VALUES
            ('Other');`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
