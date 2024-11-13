import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovedQATrackingFieldsFromResult1731503453561
  implements MigrationInterface
{
  name = 'RemovedQATrackingFieldsFromResult1731503453561';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_ff2513072e955aacb72e9041790\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`qaed_comment\``,
    );
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`qaed_date\``);
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`qaed_user\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_user\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_comment\` text COLLATE "utf8mb3_unicode_ci" NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_ff2513072e955aacb72e9041790\` FOREIGN KEY (\`qaed_user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
