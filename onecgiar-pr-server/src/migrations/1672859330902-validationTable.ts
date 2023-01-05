import { MigrationInterface, QueryRunner } from "typeorm";

export class validationTable1672859330902 implements MigrationInterface {
    name = 'validationTable1672859330902'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`results_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD CONSTRAINT \`FK_fd2b8fa2dd92672471522c88b1c\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` DROP FOREIGN KEY \`FK_fd2b8fa2dd92672471522c88b1c\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`results_id\``);
    }

}
