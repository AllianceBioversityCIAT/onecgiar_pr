import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedReportingPhaseColumn1695218172573
  implements MigrationInterface
{
  name = 'addedReportingPhaseColumn1695218172573';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`reporting_phase\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD CONSTRAINT \`FK_ee9ce1dbd69f3b8af6a287d8d50\` FOREIGN KEY (\`reporting_phase\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP FOREIGN KEY \`FK_ee9ce1dbd69f3b8af6a287d8d50\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`reporting_phase\``,
    );
  }
}
