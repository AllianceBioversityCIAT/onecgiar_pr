// @akili-spec changes/rir-center-focal-routing
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RCF-T-1 — Center focal point routing (`RCF-R-1`, `RCF-R-6`, `RCF-R-11`; `RCF-DD-1/5/6`).
 *
 * `up`:
 *   1. creates `center_reminder_routing` (center_code PK + FK to `clarisa_center.code`,
 *      `route_all_to_center` default 0, BaseEntity audit columns);
 *   2. opts ICARDA in (flag 1). The center code is resolved exactly as
 *      `1791800000000-RIR-SeedCenterMelFocalPoints` does (acronym `ICARDA`, then the
 *      institution-name pattern); an unresolved code throws, nothing is inserted as NULL;
 *   3. drops the word "bilateral" from the Center email body (row
 *      `email_template_replicated_innovation_center`, column `template`, only). The
 *      `description` column and every other template row are untouched.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: the table is unread, the copy has no "bilateral". Inert.
 *   - Code deployed without applying it: not a normal path (Jenkins applies migrations first).
 *   - Applied twice: CREATE IF NOT EXISTS; the ICARDA insert is a no-op if the row exists
 *     (the flag is NOT overwritten, so an admin's later change survives); REPLACE finds nothing.
 *   - Reverted: `down` puts "bilateral" back (same row only) and drops the table.
 */
export class RCFCenterRouting1793400000000 implements MigrationInterface {
  name = 'RCFCenterRouting1793400000000';

  private static readonly CENTER_TEMPLATE_NAME =
    'email_template_replicated_innovation_center';
  // Anchored on {{resultCount}} so `down` restores exactly the original phrase.
  private static readonly WITH_BILATERAL =
    '{{resultCount}} bilateral innovation(s)';
  private static readonly WITHOUT_BILATERAL = '{{resultCount}} innovation(s)';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const C = RCFCenterRouting1793400000000;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`center_reminder_routing\` (
        \`center_code\` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
        \`route_all_to_center\` tinyint NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`center_code\`),
        CONSTRAINT \`FK_rcf_center_routing_center\` FOREIGN KEY (\`center_code\`)
          REFERENCES \`clarisa_center\` (\`code\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    const icarda = await this.resolveIcardaCode(queryRunner);
    if (!icarda) {
      throw new Error(
        'RCF-CenterRouting: no clarisa_center matched ICARDA. Nothing was inserted.',
      );
    }
    await queryRunner.query(
      `INSERT INTO \`center_reminder_routing\` (center_code, route_all_to_center)
       SELECT cc.code, 1 FROM \`clarisa_center\` cc
        WHERE cc.code = ?
          AND NOT EXISTS (SELECT 1 FROM \`center_reminder_routing\` r WHERE r.center_code = cc.code);`,
      [icarda],
    );

    await this.replaceInCenterTemplate(
      queryRunner,
      C.WITH_BILATERAL,
      C.WITHOUT_BILATERAL,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const C = RCFCenterRouting1793400000000;
    await this.replaceInCenterTemplate(
      queryRunner,
      C.WITHOUT_BILATERAL,
      C.WITH_BILATERAL,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`center_reminder_routing\`;`,
    );
  }

  /** Same resolution as the focal-point seed (acronym first, then name pattern). */
  private async resolveIcardaCode(
    queryRunner: QueryRunner,
  ): Promise<string | null> {
    const order = 'ORDER BY cc.is_active DESC, cc.code ASC LIMIT 1';
    let rows: Array<{ code: string }> = await queryRunner.query(
      `SELECT cc.code AS code
         FROM \`clarisa_center\` cc
         JOIN \`clarisa_institutions\` ci ON ci.id = cc.institutionId
        WHERE LOWER(TRIM(ci.acronym)) = LOWER(?)
        ${order};`,
      ['ICARDA'],
    );
    if (rows?.[0]?.code) return rows[0].code;
    rows = await queryRunner.query(
      `SELECT cc.code AS code
         FROM \`clarisa_center\` cc
         JOIN \`clarisa_institutions\` ci ON ci.id = cc.institutionId
        WHERE ci.name LIKE ?
        ${order};`,
      ['%Agricultural Research in the Dry Areas%'],
    );
    return rows?.[0]?.code ?? null;
  }

  /** Center row only, template column only; never `description`, never another row. */
  private async replaceInCenterTemplate(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE \`template\`
          SET \`template\` = REPLACE(\`template\`, ?, ?), last_updated_date = CURRENT_TIMESTAMP
        WHERE name = ?
          AND INSTR(\`template\`, ?) > 0;`,
      [from, to, RCFCenterRouting1793400000000.CENTER_TEMPLATE_NAME, from],
    );
  }
}
