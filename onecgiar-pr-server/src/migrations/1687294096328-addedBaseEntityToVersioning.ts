import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedBaseEntityToVersioning1687294096328
  implements MigrationInterface
{
  name = 'addedBaseEntityToVersioning1687294096328';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`version_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`created_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`last_updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`phase_name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`toc_pahse_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`cgspace_year\` year NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`phase_year\` year NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`status\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`previous_phase\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD CONSTRAINT \`FK_5c22f3084b88e72c586e285a1cd\` FOREIGN KEY (\`previous_phase\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `update \`version\` set phase_name = 'Baseline' where id = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP FOREIGN KEY \`FK_5c22f3084b88e72c586e285a1cd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`previous_phase\``,
    );
    await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`status\``);
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`phase_year\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`cgspace_year\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`toc_pahse_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`phase_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`last_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`last_updated_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`created_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`is_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`version_name\` text COLLATE "utf8mb3_unicode_ci" NOT NULL`,
    );
  }
}
