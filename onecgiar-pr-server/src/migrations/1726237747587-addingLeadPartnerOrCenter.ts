import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingLeadPartnerOrCenter1726237747587
  implements MigrationInterface
{
  name = 'AddingLeadPartnerOrCenter1726237747587';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` ADD \`is_leading_result\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`is_leading_result\` tinyint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`is_lead_by_partner\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`is_lead_by_partner\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`is_leading_result\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` DROP COLUMN \`is_leading_result\``,
    );
  }
}
