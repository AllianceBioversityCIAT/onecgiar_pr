import { MigrationInterface, QueryRunner } from 'typeorm';

export class createResultsKPAltmetric1668029562685
  implements MigrationInterface
{
  name = 'createResultsKPAltmetric1668029562685';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_kp_altmetrics\` (\`result_kp_altmetrics_id\` bigint NOT NULL AUTO_INCREMENT, \`altmetric_id\` bigint NULL, \`journal\` text NULL, \`score\` bigint NULL, \`cited_by_posts\` bigint NULL, \`cited_by_delicious\` bigint NULL, \`cited_by_facebook_pages\` bigint NULL, \`cited_by_blogs\` bigint NULL, \`cited_by_forum_users\` bigint NULL, \`cited_by_google_plus_users\` bigint NULL, \`cited_by_linkedin_users\` bigint NULL, \`cited_by_news_outlets\` bigint NULL, \`cited_by_peer_review_sites\` bigint NULL, \`cited_by_pinterest_users\` bigint NULL, \`cited_by_policies\` bigint NULL, \`cited_by_stack_exchange_resources\` bigint NULL, \`cited_by_reddit_users\` bigint NULL, \`cited_by_research_highlight_platforms\` bigint NULL, \`cited_by_twitter_users\` bigint NULL, \`cited_by_youtube_channels\` bigint NULL, \`cited_by_weibo_users\` bigint NULL, \`cited_by_wikipedia_pages\` bigint NULL, \`last_updated\` timestamp NULL, \`image_small\` text NULL, \`image_medium\` text NULL, \`image_large\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_knowledge_product_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_kp_altmetrics_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_c6d77e362551060f3c0b9079d37\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_8306466aef994a3e1346645563b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_64ec011559c300b180c6d678c6a\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_4ead115ba43bea9eea507b379c4\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_4ead115ba43bea9eea507b379c4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_64ec011559c300b180c6d678c6a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_8306466aef994a3e1346645563b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_c6d77e362551060f3c0b9079d37\``,
    );
    await queryRunner.query(`DROP TABLE \`results_kp_altmetrics\``);
  }
}
