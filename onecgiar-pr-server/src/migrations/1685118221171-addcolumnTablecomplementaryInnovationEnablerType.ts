import { MigrationInterface, QueryRunner } from "typeorm";

export class addcolumnTablecomplementaryInnovationEnablerType1685118221171 implements MigrationInterface {
    name = 'addcolumnTablecomplementaryInnovationEnablerType1685118221171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` ADD \`level\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`complementary_innovation_enabler_types\` ADD \`level\` bigint NULL`);
    }

}
