import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3292 Step 3 — where "this innovation merged into that one" (or split into those) is stored.
 *
 * ## Why a new table and not `linked_result`
 *
 * `linked_result` looked like the obvious home: it already joins two results. It was rejected after
 * reading its lifecycle, and the reason is not style — it loses data silently.
 *
 * `LinkedResultsService.createForInnovationUse` is its **single writer on purpose** (a second writer
 * already wiped stored links once: incident P2-3199). Its `else` branch runs
 * `update({ origin_result_id, is_active: true }, { is_active: false })` — deactivating **every** link
 * on the result, with no filter on which link or why.
 *
 * That branch is not remote. It fires from two places, and the second one is fatal here:
 *   - `ContributorsPartnersService.updateContributorsAndPartners` — every save of Contributors and
 *     partners.
 *   - 🛑 `InnovationUseService.saveInnovationUse` itself: `if (!has_innovation_link) →
 *     createForInnovationUse(results_id, [], user)`. **The very form that would record the merge
 *     wipes the table whenever the reporter answers "no linked innovation".**
 *
 * ⇒ A merge stored in `linked_result` would be deleted by the same save that recorded it, in the
 * most ordinary case there is. No error, no log, no trace. The reporter would find the merge gone.
 *
 * `linked_result` also carries no link-type discriminator, so a merge would be indistinguishable
 * from an ordinary linked result — which is what makes any blanket sweep take it.
 *
 * 🥇 The rule this follows (Yeck, 3 Sep 2026): **new information gets a new table; reusing an
 * existing one is analysed every time, and the question is not "does the data fit" but "who else
 * writes, deactivates or DELETES this table, and when".** The same analysis said the opposite four
 * hours earlier for P2-3537's increment — two columns on an existing table, because that table is
 * already one row per result-per-phase and nobody else empties it. What decides is ownership of the
 * lifecycle, not the shape of the data.
 *
 * ## The shape, and why each column exists
 *
 * - `origin_result_id` — the innovation being discontinued. FK to `result.id`, which is **per phase**,
 *   so the statement belongs to the reporting cycle in which it was made. That is correct: a merge is
 *   declared in a given round.
 * - `target_result_id` — the innovation it merged into, or one of the ones it split into. NOT NULL:
 *   a transition with no target is the thing this table exists to stop being possible.
 * - `transition_type` — `merge` or `split`. The discriminator `linked_result` never had. One row per
 *   target, so "split into three" is three rows, which is what the story's multi-select means.
 * - `is_active` + audit columns, matching `BaseEntity` so the entity can extend it like every sibling.
 *
 * A `UNIQUE` on (origin, target, type) keeps a double submit from recording the same merge twice.
 * Deliberately NOT unique on (origin, type) alone: the story allows several targets.
 *
 * ## What this migration does NOT do, on purpose
 *
 * It does not add these rows to the phase rollover. Two reasons: a discontinued innovation is not
 * reported again in the next round, and touching the rollover is the exact change P2-3568 shows must
 * not go out without being exercised against a real phase change. If a merge ever has to survive a
 * rollover, that is its own decision with its own test.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: the repository would query a table that does not exist and
 *     the discontinuation read would fail. The Jenkins pipeline applies migrations before the backend
 *     serves traffic (observed on builds #2125, #2128 and #2133).
 *   - Applied twice: guarded by `CREATE TABLE IF NOT EXISTS`.
 *   - Reverted with data inside: `down` refuses to drop once any row exists. A recorded merge is a
 *     statement about where the work continued, and no `git revert` brings it back.
 */
export class CreateInnovationMergeSplitTable1788445000000
  implements MigrationInterface
{
  name = 'CreateInnovationMergeSplitTable1788445000000';

  private static readonly TABLE = 'result_innovation_merge_split';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${CreateInnovationMergeSplitTable1788445000000.TABLE}\` (
        \`result_innovation_merge_split_id\` bigint NOT NULL AUTO_INCREMENT,
        \`origin_result_id\` bigint NOT NULL COMMENT 'The innovation being discontinued, in the phase where it was declared.',
        \`target_result_id\` bigint NOT NULL COMMENT 'The innovation it merged into, or one it split into.',
        \`transition_type\` varchar(10) NOT NULL COMMENT 'merge | split — the discriminator linked_result never had.',
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`result_innovation_merge_split_id\`),
        UNIQUE INDEX \`IDX_rims_origin_target_type\` (\`origin_result_id\`, \`target_result_id\`, \`transition_type\`),
        INDEX \`IDX_rims_origin\` (\`origin_result_id\`),
        INDEX \`IDX_rims_target\` (\`target_result_id\`)
      ) ENGINE=InnoDB
    `);

    // Foreign keys added separately and guarded: re-running the migration on a database that already
    // has the table must not fail on a duplicate constraint name.
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_rims_origin_result',
      'origin_result_id',
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_rims_target_result',
      'target_result_id',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner))) {
      return;
    }

    const rows: { total: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`${CreateInnovationMergeSplitTable1788445000000.TABLE}\`;`,
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      // Somebody already recorded where their innovation continued. Dropping the table deletes
      // that statement, and nothing brings it back.
      return;
    }

    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${CreateInnovationMergeSplitTable1788445000000.TABLE}\`;`,
    );
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    constraint: string,
    column: string,
  ): Promise<void> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?;
      `,
      [CreateInnovationMergeSplitTable1788445000000.TABLE, constraint],
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${CreateInnovationMergeSplitTable1788445000000.TABLE}\`
        ADD CONSTRAINT \`${constraint}\`
        FOREIGN KEY (\`${column}\`) REFERENCES \`result\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  private async tableExists(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?;
      `,
      [CreateInnovationMergeSplitTable1788445000000.TABLE],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
