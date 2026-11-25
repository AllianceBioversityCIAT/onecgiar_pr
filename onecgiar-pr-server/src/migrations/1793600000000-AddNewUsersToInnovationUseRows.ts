import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Innovation Use 2026 — adds `new_users` to the six innovation-use row tables.
 *
 * @akili-spec changes/innovation-use-2026-total-and-new-users (IU26-T-10, design.md §2/§3/§12 DD-8,
 * requirements.md IU26-R-11 "stored, never copied")
 *
 * `new_users int unsigned NULL DEFAULT NULL` on: `result_actors`, `results_by_institution_type`,
 * `result_ip_measure`, `result_ip_result_actors`, `result_ip_result_institution_types`,
 * `result_ip_result_measures`.
 *
 * Nullable and additive; existing rows stay NULL. The column is deliberately absent from every
 * replication insert list, so a phase rollover leaves it NULL in the copy.
 *
 * Hand-written (not `migration:generate`) so no unrelated entity drift lands in this file.
 *
 * ## Futures
 *   - Applied without the new code: six inert nullable columns, always NULL.
 *   - Applied twice: TypeORM's `migrations` table prevents a re-run.
 *   - Reverted with rows inside: drops only these columns and the values they hold.
 */
const TABLES = [
  'result_actors',
  'results_by_institution_type',
  'result_ip_measure',
  'result_ip_result_actors',
  'result_ip_result_institution_types',
  'result_ip_result_measures',
];

export class AddNewUsersToInnovationUseRows1793600000000
  implements MigrationInterface
{
  name = 'AddNewUsersToInnovationUseRows1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`new_users\` int unsigned NULL DEFAULT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TABLES].reverse()) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`new_users\``,
      );
    }
  }
}
