import { MigrationInterface, QueryRunner } from "typeorm";

export class resultTocResultUpdateV21668434389604 implements MigrationInterface {
    name = 'resultTocResultUpdateV21668434389604'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_dfeb50ab280d7d5715421c9d0c8\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`initiative_id\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`initiative_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_f7f23e3fdba4e4ef60142452be9\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_f7f23e3fdba4e4ef60142452be9\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`initiative_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`initiative_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_dfeb50ab280d7d5715421c9d0c8\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
