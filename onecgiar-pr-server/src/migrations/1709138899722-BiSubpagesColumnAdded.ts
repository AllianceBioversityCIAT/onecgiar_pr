import { MigrationInterface, QueryRunner } from 'typeorm';

export class BiSubpagesColumnAdded1709138899722 implements MigrationInterface {
  name = 'BiSubpagesColumnAdded1709138899722';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`section_name_code\` text NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`section_name_code\``,
    );
  }
}
