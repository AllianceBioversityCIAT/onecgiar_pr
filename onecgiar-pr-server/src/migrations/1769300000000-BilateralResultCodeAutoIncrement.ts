import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auto-increment result_code for all results (source = 'API' or 'Result') via trigger.
 * Does not change the Result entity or any FK; assigns result_code on every INSERT.
 */
export class BilateralResultCodeAutoIncrement1769300000000
  implements MigrationInterface
{
  name = 'BilateralResultCodeAutoIncrement1769300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`result_code_seq\` (
        \`id\` int NOT NULL,
        \`last_code\` bigint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO \`result_code_seq\` (\`id\`, \`last_code\`)
      VALUES (1, (SELECT COALESCE(MAX(r.result_code), 0) FROM \`result\` r WHERE r.is_active = 1))
    `);

    await queryRunner.query(`
      CREATE TRIGGER \`result_auto_code\`
      BEFORE INSERT ON \`result\`
      FOR EACH ROW
      BEGIN
        UPDATE \`result_code_seq\` SET \`last_code\` = \`last_code\` + 1 WHERE \`id\` = 1;
        SELECT \`last_code\` INTO @next_result_code FROM \`result_code_seq\` WHERE \`id\` = 1 LIMIT 1;
        SET NEW.result_code = @next_result_code;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS \`result_auto_code\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`result_code_seq\``);
  }
}
