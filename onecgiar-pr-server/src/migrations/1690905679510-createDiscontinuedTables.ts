import { MigrationInterface, QueryRunner } from 'typeorm';

export class createDiscontinuedTables1690905679510
  implements MigrationInterface
{
  name = 'createDiscontinuedTables1690905679510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`investment_discontinued_option\` (\`investment_discontinued_option_id\` bigint NOT NULL AUTO_INCREMENT, \`option\` text NOT NULL, PRIMARY KEY (\`investment_discontinued_option_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`results_investment_discontinued_options\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`results_investment_discontinued_option_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`investment_discontinued_option_id\` bigint NOT NULL, PRIMARY KEY (\`results_investment_discontinued_option_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` ADD CONSTRAINT \`FK_d9617541a69e177593550393db3\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` ADD CONSTRAINT \`FK_66e86aa26231b1fdb1907e900a1\` FOREIGN KEY (\`investment_discontinued_option_id\`) REFERENCES \`investment_discontinued_option\`(\`investment_discontinued_option_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` DROP FOREIGN KEY \`FK_66e86aa26231b1fdb1907e900a1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` DROP FOREIGN KEY \`FK_d9617541a69e177593550393db3\``,
    );
    await queryRunner.query(
      `DROP TABLE \`results_investment_discontinued_options\``,
    );
    await queryRunner.query(`DROP TABLE \`investment_discontinued_option\``);
  }
}
