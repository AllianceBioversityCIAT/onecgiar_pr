import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedIsReplicatedIntoResult1694618798352
  implements MigrationInterface
{
  name = 'addedIsReplicatedIntoResult1694618798352';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`is_replicated\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`is_replicated\``,
    );
  }
}
