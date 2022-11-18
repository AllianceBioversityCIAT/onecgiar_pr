import { MigrationInterface, QueryRunner } from 'typeorm';

export class createResultsKPMetadata1668029357409
  implements MigrationInterface
{
  name = 'createResultsKPMetadata1668029357409';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_kp_metadata\` (\`result_kp_metadata_id\` bigint NOT NULL AUTO_INCREMENT, \`source\` text NULL, \`is_isi\` tinyint NULL, \`accesibility\` text NULL, \`year\` bigint NULL, \`doi\` text NULL, \`is_peer_reviewed\` tinyint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_knowledge_product_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_kp_metadata_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_acb6951f3607a9333b8967a1c6b\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_dd2fb5aafb98e06c3e61f61f749\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_271b374a09e72de2c62f1d00a4a\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_bba3551bbafb5cb26be70a0b96d\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_bba3551bbafb5cb26be70a0b96d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_271b374a09e72de2c62f1d00a4a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_dd2fb5aafb98e06c3e61f61f749\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_acb6951f3607a9333b8967a1c6b\``,
    );
    await queryRunner.query(`DROP TABLE \`results_kp_metadata\``);
  }
}
