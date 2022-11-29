import { MigrationInterface, QueryRunner } from "typeorm";

export class fkInstitutions1666210771461 implements MigrationInterface {
    name = 'fkInstitutions1666210771461'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`institution_types_id\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`institution_types_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` CHANGE \`institutions_id\` \`institutions_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_544ee7bf3c6f36b58fad8f5e349\` FOREIGN KEY (\`institution_types_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_a9069fbdc06a21e8a658b191704\` FOREIGN KEY (\`institutions_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_a9069fbdc06a21e8a658b191704\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_544ee7bf3c6f36b58fad8f5e349\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` CHANGE \`institutions_id\` \`institutions_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`institution_types_id\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`institution_types_id\` bigint NOT NULL`);
    }

}
