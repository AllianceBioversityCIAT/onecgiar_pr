import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedDefaultIsReplicatedIntoResult1694620127898
  implements MigrationInterface
{
  name = 'addedDefaultIsReplicatedIntoResult1694620127898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`is_replicated\` \`is_replicated\` tinyint NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`is_replicated\` \`is_replicated\` tinyint NULL`,
    );
  }
}
