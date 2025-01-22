import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddresingDemandsField1727905760292
  implements MigrationInterface
{
  name = 'AddAddresingDemandsField1727905760292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`addressing_demands\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`addressing_demands\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` ADD \`addressing_demands\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` DROP COLUMN \`addressing_demands\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`addressing_demands\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`addressing_demands\``,
    );
  }
}
