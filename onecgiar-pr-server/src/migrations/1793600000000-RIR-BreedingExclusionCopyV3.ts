// @akili-spec changes/rir-breeding-exclusion
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  RIR_BREEDING_EXCLUSION_CODES,
  RIR_BREEDING_EXCLUSION_REASON,
} from '../api/replicated-innovation-reminders/templates/rir-breeding-exclusion-codes';
import {
  RIR_CENTER_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_Q4_TEMPLATE_NAME,
  RirTemplateBodies,
  buildRirTemplatesV2,
  buildRirTemplatesV3,
} from '../api/replicated-innovation-reminders/templates/rir-template-copy';

/**
 * SR-167303 `RBX-T-2` — RIR breeding exclusion list and email copy v3 (`RBX-R-1`, `RBX-R-4`,
 * `RBX-R-5`; `design.md` §4, §6.6; `RBX-DD-2`, `DD-5`, `DD-6`, `DD-7`).
 *
 * `up`:
 *   1. creates `replicated_innovation_reminder_exclusion` (`result_code` bigint PK, `reason`
 *      varchar(255), BaseEntity audit columns). No foreign key: `result_code` is not unique in
 *      `result`;
 *   2. seeds it with the 114 codes of the sheet "Results excluded from notification"
 *      (2026-11-25) with `INSERT IGNORE`, bound parameters, one statement. The primary key makes
 *      the seed idempotent: 114 rows after any number of runs, never 228;
 *   3. rewrites the `template` column of the four RIR rows to the v3 copy, BY NAME. No other
 *      template row and no other column except `last_updated_date` is touched.
 *
 * `down`:
 *   1. rewrites the same four rows to the v2 copy, BY NAME. v2 is the body PROD holds today, the
 *      result of the three landed migrations that write RIR bodies (`1791700000000`,
 *      `1791900000000`, `1793400000000`). `templates/rir-template-copy.spec.ts` proves it byte for
 *      byte by running them (DD-7);
 *   2. drops the exclusion table, entries added by an admin after `up` included.
 *
 * The copy lives in `templates/rir-template-copy.ts` because Jest does not discover
 * `src/migrations/` (DD-5). That module is FROZEN: this migration and its `down` stay correct only
 * while `buildRirTemplatesV2()` and `buildRirTemplatesV3()` keep returning what they return today.
 * A later copy change is a v4 and a new migration, never an edit of those builders.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: the old dispatcher does not read the exclusion table, so the
 *     listed results are still emailed, and it does not pass `previousYear` or `nextNextYear`, so
 *     those two variables render empty in the v3 text. Not a normal path: Jenkins applies
 *     migrations before the new code serves traffic. The hourly cron sends only campaigns that are
 *     due, so the window matters only if one falls due between the two steps.
 *   - Code deployed without applying it: the new selection queries a table that does not exist
 *     and fails loudly (error 1146) on dispatch, preview and the Admin list. Nothing is emailed
 *     with the wrong content. Not a normal path, for the same reason.
 *   - Applied twice: `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE` change nothing the second
 *     time (an entry an admin switched off keeps its flag, because the insert never overwrites).
 *     The UPDATEs write identical bodies again, so no row count changes.
 *   - Reverted: `down` restores the v2 bodies and drops the table. Revert the code with it: the
 *     new selection needs the table.
 *
 * Every value goes through a bound parameter; nothing is SQL-escaped by hand.
 */
export class RIRBreedingExclusionCopyV31793600000000
  implements MigrationInterface
{
  name = 'RIRBreedingExclusionCopyV31793600000000';

  /** Exactly the four rows RIR created. The copy modules key their bodies by these names. */
  private static readonly TEMPLATE_NAMES = [
    RIR_Q4_TEMPLATE_NAME,
    RIR_FINAL_TEMPLATE_NAME,
    RIR_MELIA_TEMPLATE_NAME,
    RIR_CENTER_TEMPLATE_NAME,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`replicated_innovation_reminder_exclusion\` (
        \`result_code\` bigint NOT NULL,
        \`reason\` varchar(255) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`result_code\`)
      ) ENGINE=InnoDB
    `);

    const codes = RIR_BREEDING_EXCLUSION_CODES;
    await queryRunner.query(
      `INSERT IGNORE INTO \`replicated_innovation_reminder_exclusion\` (\`result_code\`, \`reason\`)
       VALUES ${codes.map(() => '(?, ?)').join(', ')};`,
      codes.flatMap((code) => [code, RIR_BREEDING_EXCLUSION_REASON]),
    );

    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV3());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.writeTemplateBodies(queryRunner, buildRirTemplatesV2());
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`replicated_innovation_reminder_exclusion\`;`,
    );
  }

  /**
   * One UPDATE per row, by name only: never touches a row RIR did not create. The statement is a
   * plain string (not a template literal) so its backticks and its by-name predicate read as
   * executed.
   */
  private async writeTemplateBodies(
    queryRunner: QueryRunner,
    bodies: RirTemplateBodies,
  ): Promise<void> {
    for (const name of RIRBreedingExclusionCopyV31793600000000.TEMPLATE_NAMES) {
      const body = bodies[name];
      if (!body) {
        // An undefined parameter would be written as NULL and wipe the template.
        throw new Error(
          `RIR-BreedingExclusionCopyV3: no body for template "${name}". Nothing was written for it.`,
        );
      }
      await queryRunner.query(
        'UPDATE `template` SET `template` = ?, last_updated_date = CURRENT_TIMESTAMP WHERE name = ?;',
        [body, name],
      );
    }
  }
}
