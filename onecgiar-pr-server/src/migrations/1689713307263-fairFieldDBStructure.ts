import { MigrationInterface, QueryRunner } from "typeorm";

export class FairFieldDBStructure1689713307263 implements MigrationInterface {
    name = 'FairFieldDBStructure1689713307263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`fair_fields\` (\`fair_field_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`short_name\` text NOT NULL, \`description\` text NULL, \`parent_id\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_updated_by\` int NULL, PRIMARY KEY (\`fair_field_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_kp_fair_scores\` (\`results_kp_fair_score_id\` bigint NOT NULL AUTO_INCREMENT, \`result_knowledge_product_id\` bigint NOT NULL, \`fair_field_id\` bigint NOT NULL, \`fair_value\` float NOT NULL, \`is_baseline\` tinyint NOT NULL DEFAULT 0, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`results_kp_fair_score_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`fair_fields\` ADD CONSTRAINT \`FK_cfc41c6dc2159f75095c165d5f2\` FOREIGN KEY (\`parent_id\`) REFERENCES \`fair_fields\`(\`fair_field_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` ADD CONSTRAINT \`FK_c14e00a24e61d4af98eec7648a3\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` ADD CONSTRAINT \`FK_6831c2b4fe95a58a6b3903504cd\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` ADD CONSTRAINT \`FK_a17fdc308cf1b1ca01c02638c38\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` ADD CONSTRAINT \`FK_156305a988c9083a01dae6ae960\` FOREIGN KEY (\`fair_field_id\`) REFERENCES \`fair_fields\`(\`fair_field_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` DROP FOREIGN KEY \`FK_156305a988c9083a01dae6ae960\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` DROP FOREIGN KEY \`FK_a17fdc308cf1b1ca01c02638c38\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` DROP FOREIGN KEY \`FK_6831c2b4fe95a58a6b3903504cd\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_scores\` DROP FOREIGN KEY \`FK_c14e00a24e61d4af98eec7648a3\``);
        await queryRunner.query(`ALTER TABLE \`fair_fields\` DROP FOREIGN KEY \`FK_cfc41c6dc2159f75095c165d5f2\``);
        await queryRunner.query(`DROP TABLE \`results_kp_fair_scores\``);
        await queryRunner.query(`DROP TABLE \`fair_fields\``);
    }

}
