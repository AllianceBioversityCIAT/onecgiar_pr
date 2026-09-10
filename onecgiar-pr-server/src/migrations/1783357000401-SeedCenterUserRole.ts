import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCenterUserRole1783357000401 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`role_levels\` (name)
      SELECT 'Center'
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_levels\` WHERE name = 'Center'
      )
    `);

    await queryRunner.query(`
      INSERT INTO \`role\` (id, description, role_level_id, active)
      SELECT
        9,
        'Center User',
        (SELECT id FROM \`role_levels\` WHERE name = 'Center' LIMIT 1),
        1
      WHERE NOT EXISTS (SELECT 1 FROM \`role\` WHERE id = 9)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`role\` WHERE id = 9`);
    await queryRunner.query(`DELETE FROM \`role_levels\` WHERE name = 'Center'`);
  }
}
