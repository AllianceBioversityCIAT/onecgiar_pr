import { MigrationInterface, QueryRunner } from 'typeorm';

export class removedIndexInResult1693838727958 implements MigrationInterface {
  name = 'removedIndexInResult1693838727958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_815ce4543cd4ee4a1a7ec26f9b\` ON \`result\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_815ce4543cd4ee4a1a7ec26f9b\` ON \`result\` (\`result_code\`, \`version_id\`)`,
    );
  }
}
