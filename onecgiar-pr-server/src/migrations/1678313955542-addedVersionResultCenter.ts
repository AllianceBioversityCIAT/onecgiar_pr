import { MigrationInterface, QueryRunner } from "typeorm";

export class addedVersionResultCenter1678313955542 implements MigrationInterface {
    name = 'addedVersionResultCenter1678313955542'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`version_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_879032c813e625f92bfbca87dc1\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE results_center SET version_id = 1;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_879032c813e625f92bfbca87dc1\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`version_id\``);
    }

}
