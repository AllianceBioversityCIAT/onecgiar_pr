import { MigrationInterface, QueryRunner } from "typeorm";

export class createKPFairBase1669909948515 implements MigrationInterface {
    name = 'createKPFairBase1669909948515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`knowledge_product_fair_baseline\` (\`knowledge_product_fair_baseline_id\` bigint NOT NULL AUTO_INCREMENT, \`findable\` float NULL, \`accesible\` float NULL, \`interoperable\` float NULL, \`reusable\` float NULL, \`knowledge_product_id\` bigint NULL, PRIMARY KEY (\`knowledge_product_fair_baseline_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`knowledge_product_fair_baseline\` ADD CONSTRAINT \`FK_3dffac8142e130ed3aeebf23c79\` FOREIGN KEY (\`knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`knowledge_product_fair_baseline\` DROP FOREIGN KEY \`FK_3dffac8142e130ed3aeebf23c79\``);
        await queryRunner.query(`DROP TABLE \`knowledge_product_fair_baseline\``);
    }

}
