import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedQATrackingColumnsForResults1729692807743
  implements MigrationInterface
{
  name = 'AddedQATrackingColumnsForResults1729692807743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_comment\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`qaed_user\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_ff2513072e955aacb72e9041790\` FOREIGN KEY (\`qaed_user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_ff2513072e955aacb72e9041790\``,
    );
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`qaed_user\``);
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`qaed_comment\``,
    );
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`qaed_date\``);
  }
}
