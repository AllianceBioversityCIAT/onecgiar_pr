import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillLegacyClarisaProjectsPhase1787147350000
  implements MigrationInterface
{
  name = 'BackfillLegacyClarisaProjectsPhase1787147350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Catch-up for environments that already ran
    // AddW3RegistryFieldsToClarisaProjects1786980549228 before it backfilled
    // phase itself: any project synced before that column existed is legacy
    // CLARISA-native data (2020-2025), matching CLARISA's own backfill.
    await queryRunner.query(
      `UPDATE \`clarisa_projects\` SET \`phase\` = 2025 WHERE \`phase\` IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`clarisa_projects\` SET \`phase\` = NULL WHERE \`phase\` = 2025`,
    );
  }
}
