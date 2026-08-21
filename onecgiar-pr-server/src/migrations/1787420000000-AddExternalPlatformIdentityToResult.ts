import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3166 — records which external platform a result came from.
 *
 * `result.source` already says *how* a result arrived (`'Result' | 'API'`) but never *from whom*,
 * which is exactly what AC3 needs to route a webhook back. These three columns close that gap:
 *
 * - `external_platform_id` / `external_platform_code`: the calling system as CLARISA resolved it
 *   from the API key (`mis.id` / `mis.acronym`). Authenticated, unlike the request body's
 *   `tenant`, which the caller declares and which must never drive routing.
 * - `external_reference`: the upstream's own `idempotencyKey` for the payload, so a platform can
 *   correlate our callback against its own record without us changing the request contract.
 *
 * Deliberately no backfill: existing rows genuinely do not carry this information, and inventing
 * it would be worse than leaving it null. The webhook skips a result with no platform and logs it.
 */
export class AddExternalPlatformIdentityToResult1787420000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`external_platform_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`external_platform_code\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`external_reference\` varchar(191) NULL`,
    );

    // The webhook dispatcher looks results up by platform; every other read path filters on
    // `result.id` and does not need this.
    await queryRunner.query(
      `CREATE INDEX \`idx_result_external_platform_id\` ON \`result\` (\`external_platform_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_result_external_platform_id\` ON \`result\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`external_reference\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`external_platform_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`external_platform_id\``,
    );
  }
}
