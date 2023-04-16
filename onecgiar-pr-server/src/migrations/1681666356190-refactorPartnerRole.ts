import { MigrationInterface, QueryRunner } from "typeorm"

export class refactorPartnerRole1681666356190 implements MigrationInterface {
    name: 'refactorPartnerRole1681666356190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`        
        UPDATE institution_role
        SET name='Expected partner'
        WHERE id=7;
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
