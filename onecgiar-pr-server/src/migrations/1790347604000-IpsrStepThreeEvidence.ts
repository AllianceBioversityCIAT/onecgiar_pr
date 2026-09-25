import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3824 — IPSR Step 3 "Package and Assess": a list of evidence per component and level.
 *
 * Step 3 stored one link (+ details) per level per component in `result_by_innovation_package`
 * (`readinees_evidence_link`, `use_evidence_link`, ...). The new lists are `evidence` rows (the
 * table Results already use, so tags and SharePoint uploads come for free) of the new type 7
 * `ipsr_step_three`, tied to their component and level by a CHILD table,
 * `result_ip_step_three_evidence`.
 *
 * 🛑 Why a child table and not two columns on `evidence` (repo rule 25, 25-Sep-2026): `Evidence`
 * is read and written by the whole platform. A column on it enters every `find`/`save` and the
 * phase replication of every result, so code reaching an environment before this migration would
 * break the Evidence section of ALL results. With the child table, the same accident only breaks
 * IPSR Step 3 evidence — the only code that names the table.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: one catalog row and an empty table nobody reads. Inert.
 *   - Code without it: only the IPSR Step 3 evidence queries fail; nothing else names the table.
 *   - Applied twice: `CREATE TABLE IF NOT EXISTS` + `NOT EXISTS` on the catalog row.
 *   - Reverted with data inside: `down` keeps the table while it has rows and keeps type 7 while
 *     any evidence uses it — those rows are the reporters' evidence.
 *
 * No backfill: existing evidence is untouched. The legacy single-link columns keep being written
 * (dual write) by the application.
 */
export class IpsrStepThreeEvidence1790347604000 implements MigrationInterface {
  name = 'IpsrStepThreeEvidence1790347604000';

  private static readonly EVIDENCE_TYPE_ID = 7;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO \`evidence_types\` (\`id\`, \`name\`, \`description\`)
        SELECT ?, 'ipsr_step_three', 'IPSR Step 3 evidence per component and level'
        WHERE NOT EXISTS (SELECT 1 FROM \`evidence_types\` WHERE \`id\` = ?);
      `,
      [
        IpsrStepThreeEvidence1790347604000.EVIDENCE_TYPE_ID,
        IpsrStepThreeEvidence1790347604000.EVIDENCE_TYPE_ID,
      ],
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`result_ip_step_three_evidence\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`evidence_id\` bigint NOT NULL COMMENT 'P2-3824: evidence row (type 7)',
        \`result_by_innovation_package_id\` bigint NOT NULL COMMENT 'P2-3824: IPSR Step 3 component',
        \`ipsr_evidence_level\` varchar(20) NOT NULL COMMENT 'P2-3824: readiness | use',
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_ip_step_three_evidence_evidence\` (\`evidence_id\`),
        KEY \`IDX_ip_step_three_evidence_component\` (\`result_by_innovation_package_id\`, \`ipsr_evidence_level\`)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const used: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'result_ip_step_three_evidence';
      `,
    );
    if (Number(used?.[0]?.total ?? 0) > 0) {
      const rows: { total: number }[] = await queryRunner.query(
        'SELECT COUNT(*) AS total FROM `result_ip_step_three_evidence`;',
      );
      // Rows are the reporters' evidence links: dropping them orphans the evidence for good.
      if (Number(rows?.[0]?.total ?? 0) === 0) {
        await queryRunner.query('DROP TABLE `result_ip_step_three_evidence`;');
      }
    }

    await queryRunner.query(
      `
        DELETE FROM \`evidence_types\`
        WHERE \`id\` = ?
          AND NOT EXISTS (
            SELECT 1 FROM (
              SELECT e.id FROM \`evidence\` e WHERE e.evidence_type_id = ? LIMIT 1
            ) used
          );
      `,
      [
        IpsrStepThreeEvidence1790347604000.EVIDENCE_TYPE_ID,
        IpsrStepThreeEvidence1790347604000.EVIDENCE_TYPE_ID,
      ],
    );
  }
}
