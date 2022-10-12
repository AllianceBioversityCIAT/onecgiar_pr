import { MigrationInterface, QueryRunner } from 'typeorm';

export class yearInsert1665152438076 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const year = await queryRunner.query(
      `INSERT IGNORE INTO \`year\` (year) VALUES ('2022')`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO \`year\` (year) VALUES ('2023')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
