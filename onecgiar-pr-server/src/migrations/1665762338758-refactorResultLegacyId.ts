import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultLegacyId1665762338758 implements MigrationInterface {
    name = 'refactorResultLegacyId1665762338758'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`legacy_id\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_713f33e5d065891936a2fd93464\` FOREIGN KEY (\`legacy_id\`) REFERENCES \`legacy_result\`(\`legacy_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_713f33e5d065891936a2fd93464\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`legacy_id\``);
    }

}
