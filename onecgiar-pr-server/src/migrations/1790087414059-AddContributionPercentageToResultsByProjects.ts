import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3760 — "Contribution" percentage on the W3/Bilateral project link.
 *
 * P2-3352 § 6 asks Section 1 of the bilateral form for a numeric field followed by %,
 * defaulting to 100 and editable only while the result is in Editing. There was nowhere to
 * store it: `results_by_projects` carried only `is_lead`.
 *
 * Additive, nullable, no database default and no backfill, so each of the four futures is safe:
 * applied without the code the column sits unread; the code never runs without it because the
 * deployment pipeline applies migrations in the same deploy; `down` drops only this column.
 * NULL is the "never answered" state and the form renders it as 100, so rows written before the
 * column existed keep reading correctly.
 */
export class AddContributionPercentageToResultsByProjects1790087414059
  implements MigrationInterface
{
  name = 'AddContributionPercentageToResultsByProjects1790087414059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_projects\` ADD \`contribution_percentage\` decimal(5,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_projects\` DROP COLUMN \`contribution_percentage\``,
    );
  }
}
