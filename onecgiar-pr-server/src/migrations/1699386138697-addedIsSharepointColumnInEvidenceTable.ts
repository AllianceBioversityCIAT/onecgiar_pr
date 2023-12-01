import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedIsSharepointColumnInEvidenceTable1699386138697
  implements MigrationInterface
{
  name = 'addedIsSharepointColumnInEvidenceTable1699386138697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`is_sharepoint\` tinyint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`is_sharepoint\``,
    );
  }
}

