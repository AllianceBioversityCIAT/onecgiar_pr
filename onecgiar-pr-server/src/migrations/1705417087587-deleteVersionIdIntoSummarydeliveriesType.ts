import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteVersionIdIntoSummarydeliveriesType1705417087587
  implements MigrationInterface
{
  name = 'DeleteVersionIdIntoSummarydeliveriesType1705417087587';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP FOREIGN KEY \`FK_76230eb8a8feedb43f23529f1ad\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_institutions_by_deliveries_type\` DROP COLUMN \`versions_id\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD \`versions_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_institutions_by_deliveries_type\` ADD CONSTRAINT \`FK_76230eb8a8feedb43f23529f1ad\` FOREIGN KEY (\`versions_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
