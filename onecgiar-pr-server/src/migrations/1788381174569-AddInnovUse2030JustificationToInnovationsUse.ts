import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3295 §3 — the justification a reporter must write when they change a 2030 projection that
 * came from the previous reporting phase.
 *
 * Nullable with no default on purpose: it only carries meaning for a result whose projection was
 * revised, and the story caps it at 100 words. `text` rather than a sized varchar because the cap
 * is a word count enforced on screen, not a character limit anyone measured here.
 *
 * 🛑 NOT reusing `readiness_level_explanation`: that one is the justification for a DROP in
 * readiness level, a different question with a different trigger. One column per question, or the
 * two answers overwrite each other.
 *
 * ⚠️ Written by hand, not with `migration:generate`: the generator emits statements for 27 tables
 * of pre-existing drift between the entities and the database — see the note in
 * `1788358236654-AddActorsInfluencedToPolicyChanges.ts`.
 */
export class AddInnovUse2030JustificationToInnovationsUse1788381174569
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` ADD \`innov_use_2030_justification\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innov_use_2030_justification\``,
    );
  }
}
