import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedInQAColumnInEvidenceTable1699026813384
  implements MigrationInterface
{
  name = 'addedInQAColumnInEvidenceTable1699026813384';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`in_qa\` tinyint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`in_qa\``);
  }
}

