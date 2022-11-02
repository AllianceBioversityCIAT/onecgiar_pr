import { MigrationInterface, QueryRunner } from "typeorm";

export class addLinkedResultFix1667350938433 implements MigrationInterface {
    name = 'addLinkedResultFix1667350938433'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`linked-result\``);
        await queryRunner.query(`CREATE TABLE \`linked_result\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`linked_results_id\` bigint NULL, \`origin_result_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_724e1bf1ee91424bedadc0958fb\` FOREIGN KEY (\`linked_results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_020cd13b23b258c0d318ac5dcc0\` FOREIGN KEY (\`origin_result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_b292bf77ad02afcc6bf66f84b0a\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_794e5e697092e8fa6a873e12b56\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_794e5e697092e8fa6a873e12b56\``);
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_b292bf77ad02afcc6bf66f84b0a\``);
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_020cd13b23b258c0d318ac5dcc0\``);
        await queryRunner.query(`ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_724e1bf1ee91424bedadc0958fb\``);
        await queryRunner.query(`DROP TABLE \`linked_result\``);
    }

}
