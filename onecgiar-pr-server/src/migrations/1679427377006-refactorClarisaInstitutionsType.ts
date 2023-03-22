import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorClarisaInstitutionsType1679427377006 implements MigrationInterface {
    name = 'refactorClarisaInstitutionsType1679427377006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`id_parent\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD CONSTRAINT \`FK_e44a9c1ba1d1db385ed7c672529\` FOREIGN KEY (\`id_parent\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP FOREIGN KEY \`FK_e44a9c1ba1d1db385ed7c672529\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`id_parent\``);
    }

}
