import { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteReportedYearFk1688144654075 implements MigrationInterface {
  name = 'deleteReportedYearFk1688144654075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_454bdc19227ad6a58d5ddfbaf7e\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_454bdc19227ad6a58d5ddfbaf7e\` FOREIGN KEY (\`reported_year_id\`) REFERENCES \`year\`(\`year\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
