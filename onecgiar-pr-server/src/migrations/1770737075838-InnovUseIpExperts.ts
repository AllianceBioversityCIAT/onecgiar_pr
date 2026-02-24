import { MigrationInterface, QueryRunner } from "typeorm";

export class InnovUseIpExperts1770737075838 implements MigrationInterface {
    name = 'InnovUseIpExperts1770737075838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`ip_support_center_id\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_182e34e3cf2b0358bd12877469e\` FOREIGN KEY (\`ip_support_center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_182e34e3cf2b0358bd12877469e\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`ip_support_center_id\``);
    }

}
