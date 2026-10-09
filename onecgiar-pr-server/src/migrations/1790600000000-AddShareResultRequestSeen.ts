import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `BRS-T-1` - bell-read-state, design.md 5 / `BRS-DD-1`.
 *
 * Per-(request, user) "seen" fact table. Composite PK `(share_result_request_id, user_id)`
 * makes insert-ignore idempotent; the secondary index serves "which of these ids has this user
 * seen". `seen_date` deliberately has NO `ON UPDATE` (the trap in `users.last_pop_up_viewed`).
 * FKs cascade, so deleting a request or a user cannot leave orphans.
 *
 * Four futures (repo rule 25):
 *   - Applied without the new code: an empty table nobody reads.
 *   - Code without it: not a normal deploy (Jenkins applies migrations first, server CLAUDE.md 5).
 *   - Applied twice: `CREATE TABLE IF NOT EXISTS`.
 *   - Reverted: `down` drops only this table. Seen rows are disposable UI state, so no
 *     row-count refusal is needed.
 */
export class AddShareResultRequestSeen1790600000000
  implements MigrationInterface
{
  name = 'AddShareResultRequestSeen1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`share_result_request_seen\` (
        \`share_result_request_id\` int NOT NULL,
        \`user_id\` int NOT NULL,
        \`seen_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`share_result_request_id\`, \`user_id\`),
        INDEX \`IDX_srrs_user_request\` (\`user_id\`, \`share_result_request_id\`),
        CONSTRAINT \`FK_srrs_share_result_request\` FOREIGN KEY (\`share_result_request_id\`)
          REFERENCES \`share_result_request\` (\`share_result_request_id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_srrs_user\` FOREIGN KEY (\`user_id\`)
          REFERENCES \`users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`share_result_request_seen\``,
    );
  }
}
