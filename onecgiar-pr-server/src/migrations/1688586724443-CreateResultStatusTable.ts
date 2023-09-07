import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultStatusTable1688586724443
  implements MigrationInterface
{
  name = 'CreateResultStatusTable1688586724443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_status\` (\`result_status_id\` bigint NOT NULL AUTO_INCREMENT, \`status_name\` text NOT NULL, \`status_description\` text NULL, PRIMARY KEY (\`result_status_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO \`result_status\` (status_name) VALUES ('Editing'), ('Quality Assessed'), ('Submitted')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`result_status\``);
  }
}
