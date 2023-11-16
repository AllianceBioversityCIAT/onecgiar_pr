import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedDefaultInisPublicFileTableColumn1699540561734
  implements MigrationInterface
{
  name = 'addedDefaultInisPublicFileTableColumn1699540561734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`is_public_file\` \`is_public_file\` tinyint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`is_public_file\` \`is_public_file\` tinyint NOT NULL`,
    );
  }
}

