import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-2932 AC4 — the count a Policy Change result reports when it is about the capacity development
 * of key actors in a policy process (answer 51 to "Is this result related to").
 *
 * Nullable with no default on purpose: the column only carries meaning for that answer. For every
 * other Policy Change result it stays empty, and a default of 0 would be indistinguishable from
 * "nobody was influenced".
 *
 * ⚠️ Generated with `migration:generate` and then PRUNED. The generator emitted statements for 27
 * tables — pre-existing drift between the entities and the database, none of it this ticket's work.
 * Only the two statements for `results_policy_changes` were kept; shipping the rest would apply
 * schema changes nobody reviewed under the name of this story.
 */
export class AddActorsInfluencedToPolicyChanges1788358236654
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` ADD \`actors_influenced\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` DROP COLUMN \`actors_influenced\``,
    );
  }
}
