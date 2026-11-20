// @akili-spec bilateral/evidence-privacy-tag
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * EVP-T-1 — `evidence.is_public` (`EVP-R-1` storage; design §3.1/§3.2).
 *
 * `up`: adds `evidence.is_public` TINYINT NULL, no default, no backfill. The column holds the
 * answer for bilateral link items only: 1 = public, 0 = private, NULL = untagged (reads as public).
 * It is added only when absent.
 *
 * `down`: drops the column when present. Tags written meanwhile are lost.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: the column is unread. Inert.
 *   - Code deployed without applying it: not a normal path (Jenkins applies migrations first).
 *   - Applied twice: guarded by an information_schema check, so the second run is a no-op.
 *   - Reverted: the column is dropped and tags are lost. Effective visibility falls back to
 *     public for links, which is today's behaviour.
 */
export class EVPAddEvidenceIsPublic1793500000000 implements MigrationInterface {
  name = 'EVPAddEvidenceIsPublic1793500000000';

  private static readonly TABLE = 'evidence';
  private static readonly COLUMN = 'is_public';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner)) return;
    await queryRunner.query(
      `ALTER TABLE \`${EVPAddEvidenceIsPublic1793500000000.TABLE}\` ADD \`${EVPAddEvidenceIsPublic1793500000000.COLUMN}\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner))) return;
    await queryRunner.query(
      `ALTER TABLE \`${EVPAddEvidenceIsPublic1793500000000.TABLE}\` DROP COLUMN \`${EVPAddEvidenceIsPublic1793500000000.COLUMN}\``,
    );
  }

  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?;
      `,
      [
        EVPAddEvidenceIsPublic1793500000000.TABLE,
        EVPAddEvidenceIsPublic1793500000000.COLUMN,
      ],
    );
    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
