import { MigrationInterface, QueryRunner } from "typeorm";

export class addLinkedResult1667350610052 implements MigrationInterface {
    name = 'addLinkedResult1667350610052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`linked-result\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`linked_results_id\` bigint NULL, \`origin_result_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`linked-result\` ADD CONSTRAINT \`FK_82270feb5cbe370c3bda3ded93a\` FOREIGN KEY (\`linked_results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked-result\` ADD CONSTRAINT \`FK_e8215fa3e2a69387934c21fee3e\` FOREIGN KEY (\`origin_result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked-result\` ADD CONSTRAINT \`FK_24f2e3b736ffc64f09bdd1571cd\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked-result\` ADD CONSTRAINT \`FK_29997f755be1c0dcbcc4aaad1cb\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`linked-result\` DROP FOREIGN KEY \`FK_29997f755be1c0dcbcc4aaad1cb\``);
        await queryRunner.query(`ALTER TABLE \`linked-result\` DROP FOREIGN KEY \`FK_24f2e3b736ffc64f09bdd1571cd\``);
        await queryRunner.query(`ALTER TABLE \`linked-result\` DROP FOREIGN KEY \`FK_e8215fa3e2a69387934c21fee3e\``);
        await queryRunner.query(`ALTER TABLE \`linked-result\` DROP FOREIGN KEY \`FK_82270feb5cbe370c3bda3ded93a\``);
        await queryRunner.query(`DROP TABLE \`linked-result\``);
    }

}
