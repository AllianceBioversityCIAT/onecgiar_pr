import { MigrationInterface, QueryRunner } from "typeorm"

export class addComplementaryInnovationFuctions1680036666706 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO
                prdb.complementary_innovation_functions (name)
        VALUES
                (
                        'Improves beneficiary / user awareness of the core innovation'
                ),
                (
                        'Improves beneficiary / user confidence / trust in core innovation'
                ),
                (
                        'Improves availability and beneficiary / user access to core innovation'
                ),
                (
                        'Improves beneficiary / user access to finance / affordability of the core innovation'
                ),
                (
                        'Improves compatibility of core innovation with existing farming / market / business systems and models'
                ),
                (
                        'Improves beneficiary / user capacity and knowhow to appropriately use the core innovation'
                ),
                (
                        'Improves legal conditions and governance to scale the core innovation (new or improved by-laws, policies, regulations and mechanisms)'
                ),
                (
                        'Improves stakeholder coordination and partnerships'
                );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
