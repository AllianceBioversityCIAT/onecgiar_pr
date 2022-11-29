import { MigrationInterface, QueryRunner } from 'typeorm';

export class createResultsKPAuthors1668029210211 implements MigrationInterface {
  name = 'createResultsKPAuthors1668029210211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_kp_authors\` (\`result_kp_author_id\` bigint NOT NULL AUTO_INCREMENT, \`author_name\` text NULL, \`orcid\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_knowledge_product_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_kp_author_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_0b654bf4b5c26049b010a6ec1dd\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_e23e1ec0ab2d53c5f02d858549c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_a7da19624d1eac69fd27c09afed\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_727ff15a88662119a3fed938126\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_727ff15a88662119a3fed938126\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_a7da19624d1eac69fd27c09afed\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_e23e1ec0ab2d53c5f02d858549c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_0b654bf4b5c26049b010a6ec1dd\``,
    );
    await queryRunner.query(`DROP TABLE \`results_kp_authors\``);
  }
}
