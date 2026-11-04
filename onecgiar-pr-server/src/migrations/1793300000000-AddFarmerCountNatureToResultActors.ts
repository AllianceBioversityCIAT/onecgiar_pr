import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `result_actors` — adds `count_unit` and `use_nature` (Innovation Use, Farmers rows).
 *
 * @akili-spec changes/innovation-use-farmer-count-nature (IFC-T-2, design.md §5,
 * requirements.md IFC-R-7 / IFC-R-8)
 *
 * - `count_unit` varchar(32) NULL — `households` | `individuals`.
 * - `use_nature` varchar(32) NULL — `information_received` | `innovation_applied`.
 *
 * varchar + a server-side whitelist instead of a MySQL ENUM (design IFC-DD-3): a new value is
 * a code change, not an ALTER on a large shared table. Both columns are nullable and additive;
 * existing rows stay NULL until a submitter answers (IFC-R-7).
 *
 * Hand-written (not `migration:generate`) so no unrelated entity drift lands in this file.
 *
 * ## Futures
 *   - Applied without the new code: two inert nullable columns, always NULL.
 *   - Applied twice: TypeORM's `migrations` table prevents a re-run.
 *   - Reverted with rows inside: drops only these two columns and their answers.
 */
export class AddFarmerCountNatureToResultActors1793300000000
  implements MigrationInterface
{
  name = 'AddFarmerCountNatureToResultActors1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`count_unit\` varchar(32) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`use_nature\` varchar(32) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`use_nature\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`count_unit\``,
    );
  }
}
