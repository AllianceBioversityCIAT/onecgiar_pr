import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultsKPFairBaseline1669913789389 implements MigrationInterface {
    name = 'createResultsKPFairBaseline1669913789389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`results_kp_fair_baseline\` (\`results_kp_fair_baseline_id\` bigint NOT NULL AUTO_INCREMENT, \`findable\` float NULL, \`accesible\` float NULL, \`interoperable\` float NULL, \`reusable\` float NULL, \`knowledge_product_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` int NOT NULL, PRIMARY KEY (\`results_kp_fair_baseline_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_baseline\` ADD CONSTRAINT \`FK_88997b1b22dbf83dbae1efc0948\` FOREIGN KEY (\`knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_baseline\` ADD CONSTRAINT \`FK_d223312b71f0708394823033e3f\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_baseline\` DROP FOREIGN KEY \`FK_d223312b71f0708394823033e3f\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_fair_baseline\` DROP FOREIGN KEY \`FK_88997b1b22dbf83dbae1efc0948\``);
        await queryRunner.query(`DROP TABLE \`results_kp_fair_baseline\``);
    }

}
