import { MigrationInterface, QueryRunner } from 'typeorm';

export class resultEntityDefaultStatus1664550493695
  implements MigrationInterface
{
  name = 'resultEntityDefaultStatus1664550493695';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`status\` \`status\` tinyint NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` CHANGE \`status\` \`status\` tinyint NULL`,
    );
  }
}
