import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateValidtionMap1762551030319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM validation_maps WHERE display_name IN ('contributor-partners');`,
    );
    await queryRunner.query(
      `INSERT INTO validation_maps (display_name, function_name) VALUES ('contributor-partners', 'contributor_partner');`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM validation_maps WHERE display_name IN ('contributor-partners');`,
    );
  }
}
