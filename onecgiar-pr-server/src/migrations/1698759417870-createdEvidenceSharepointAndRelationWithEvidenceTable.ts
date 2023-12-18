import { MigrationInterface, QueryRunner } from 'typeorm';

export class createdEvidenceSharepointAndRelationWithEvidenceTable1698759417870
  implements MigrationInterface
{
  name = 'createdEvidenceSharepointAndRelationWithEvidenceTable1698759417870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`evidence_sharepoint\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`document_id\` varchar(1000) NOT NULL, \`file_name\` varchar(1000) NOT NULL, \`folder_path\` varchar(1000) NOT NULL, \`is_public_file\` tinyint NOT NULL, \`evidence_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD CONSTRAINT \`FK_a48ac840a088a11b62ed0dcba69\` FOREIGN KEY (\`evidence_id\`) REFERENCES \`evidence\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP FOREIGN KEY \`FK_a48ac840a088a11b62ed0dcba69\``,
    );
    await queryRunner.query(`DROP TABLE \`evidence_sharepoint\``);
  }
}

