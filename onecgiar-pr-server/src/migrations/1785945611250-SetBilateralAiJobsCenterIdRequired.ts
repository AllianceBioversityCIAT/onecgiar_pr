import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetBilateralAiJobsCenterIdRequired1785945611250
  implements MigrationInterface
{
  name = 'SetBilateralAiJobsCenterIdRequired1785945611250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill rows created before center_id was populated, using each job's
    // project's lead center (every project offered by the creation flow is
    // already scoped to one center, so this always resolves).
    await queryRunner.query(`
      UPDATE \`bilateral_ai_jobs\` baj
      JOIN \`clarisa_projects\` cp ON cp.\`id\` = baj.\`project_id\`
      SET baj.\`center_id\` = cp.\`organization_code\`
      WHERE baj.\`center_id\` IS NULL AND cp.\`organization_code\` IS NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE \`bilateral_ai_jobs\` CHANGE \`center_id\` \`center_id\` int NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_ai_jobs\` CHANGE \`center_id\` \`center_id\` int NULL`,
    );

    await queryRunner.query(`
      UPDATE \`bilateral_ai_jobs\` baj
      JOIN \`clarisa_projects\` cp ON cp.\`id\` = baj.\`project_id\`
      SET baj.\`center_id\` = NULL
      WHERE baj.\`center_id\` = cp.\`organization_code\`
    `);
  }
}
