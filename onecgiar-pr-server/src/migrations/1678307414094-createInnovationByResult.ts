import { MigrationInterface, QueryRunner } from "typeorm";

export class createInnovationByResult1678307414094 implements MigrationInterface {
    name = 'createInnovationByResult1678307414094'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`innovation_by_result\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`innovation_by_result_id\` bigint NOT NULL AUTO_INCREMENT, \`ipsr_result_id\` bigint NOT NULL, \`result_id\` bigint NOT NULL, PRIMARY KEY (\`innovation_by_result_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` ADD CONSTRAINT \`FK_c55740b74d7154a75fbf838babc\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` ADD CONSTRAINT \`FK_f687b17acce6ff78b6fdb0bd167\` FOREIGN KEY (\`ipsr_result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` ADD CONSTRAINT \`FK_518b47345f714f66a45a3cb397b\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` DROP FOREIGN KEY \`FK_518b47345f714f66a45a3cb397b\``);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` DROP FOREIGN KEY \`FK_f687b17acce6ff78b6fdb0bd167\``);
        await queryRunner.query(`ALTER TABLE \`innovation_by_result\` DROP FOREIGN KEY \`FK_c55740b74d7154a75fbf838babc\``);
        await queryRunner.query(`DROP TABLE \`innovation_by_result\``);
    }

}
