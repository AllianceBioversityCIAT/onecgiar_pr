import { MigrationInterface, QueryRunner } from 'typeorm';

export class createResultsKnowledgeProduct1668028918038
  implements MigrationInterface
{
  name = 'createResultsKnowledgeProduct1668028918038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_knowledge_product\` (\`result_knowledge_product_id\` bigint NOT NULL AUTO_INCREMENT, \`handle\` text NULL, \`issue_date\` bigint NULL, \`knowledge_product_type\` text NULL, \`is_peer_reviewed\` tinyint NULL, \`is_isi\` tinyint NULL, \`doi\` text NULL, \`accesibility\` text NULL, \`licence\` text NULL, \`comodity\` text NULL, \`sponsors\` text NULL, \`findable\` float NULL, \`accesible\` float NULL, \`interoperable\` float NULL, \`reusable\` float NULL, \`is_melia\` tinyint NULL, \`melia_previous_submitted\` tinyint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NULL, \`melia_type_id\` int NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_knowledge_product_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_cec37dd9524730ed14f4f7ee325\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_8382aa31bd0f65d8a84a552b88a\` FOREIGN KEY (\`melia_type_id\`) REFERENCES \`clarisa_melia_study_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_157a2cef4b40e04e814de706cf5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_4ae131d1e2aa1add868ef31cae3\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_1ffe251b8833e87758fecd44d2f\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_1ffe251b8833e87758fecd44d2f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_4ae131d1e2aa1add868ef31cae3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_157a2cef4b40e04e814de706cf5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_8382aa31bd0f65d8a84a552b88a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_cec37dd9524730ed14f4f7ee325\``,
    );
    await queryRunner.query(`DROP TABLE \`results_knowledge_product\``);
  }
}
