import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedResultMeasure1692906645967 implements MigrationInterface {
    name = 'updatedResultMeasure1692906645967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD \`result_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD CONSTRAINT \`FK_77c9f82d9f31ace4275c134bfd4\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP FOREIGN KEY \`FK_77c9f82d9f31ace4275c134bfd4\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP COLUMN \`result_id\``);
    }

}
