import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedBaseEntityInSharePointTable1699420775972
  implements MigrationInterface
{
  name = 'addedBaseEntityInSharePointTable1699420775972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD \`created_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` ADD \`last_updated_by\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_sharepoint\` DROP COLUMN \`is_active\``,
    );
  }
}

