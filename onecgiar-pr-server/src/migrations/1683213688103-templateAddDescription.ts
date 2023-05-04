import { MigrationInterface, QueryRunner } from 'typeorm';

export class TemplateAddDescription1683213688103 implements MigrationInterface {
  name = 'TemplateAddDescription1683213688103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD \`description\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP COLUMN \`description\``,
    );
  }
}
