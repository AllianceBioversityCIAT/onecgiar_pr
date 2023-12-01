import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateNulleablesInSharePointTable1699451246740
  implements MigrationInterface
{
  name = 'updateNulleablesInSharePointTable1699451246740';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`document_id\` \`document_id\` varchar(1000) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`file_name\` \`file_name\` varchar(1000) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`folder_path\` \`folder_path\` varchar(1000) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`folder_path\` \`folder_path\` varchar(1000) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`file_name\` \`file_name\` varchar(1000) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` CHANGE \`document_id\` \`document_id\` varchar(1000) NOT NULL`,
    );
  }
}

