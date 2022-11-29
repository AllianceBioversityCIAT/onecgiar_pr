import { MigrationInterface, QueryRunner } from 'typeorm';

export class createYearTable1665071677298 implements MigrationInterface {
  name = 'createYearTable1665071677298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`year\` (\`year\` year NOT NULL, \`active\` tinyint NOT NULL DEFAULT '1', \`start_date\` timestamp NULL, \`end_date\` timestamp NULL, PRIMARY KEY (\`year\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`reported_year_id\` year NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_454bdc19227ad6a58d5ddfbaf7e\` FOREIGN KEY (\`reported_year_id\`) REFERENCES \`year\`(\`year\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_454bdc19227ad6a58d5ddfbaf7e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`reported_year_id\``,
    );
    await queryRunner.query(`DROP TABLE \`year\``);
  }
}
