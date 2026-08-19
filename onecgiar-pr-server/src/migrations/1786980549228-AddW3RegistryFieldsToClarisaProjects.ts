import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddW3RegistryFieldsToClarisaProjects1786980549228
  implements MigrationInterface
{
  name = 'AddW3RegistryFieldsToClarisaProjects1786980549228';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`phase\` int NULL`,
    );
    // Backfill: every project that existed before this migration is, by
    // definition, legacy CLARISA-native data (2020-2025), matching the
    // same phase=2025 backfill CLARISA applied on its own `project` table.
    // Column stays nullable (not NOT NULL DEFAULT 2025) because
    // ClarisaEndpoints.projectMapper() always sends an explicit `phase`
    // value (possibly null, if the source CLARISA env doesn't send it yet)
    // on every insert/update — a NOT NULL default would break those writes.
    await queryRunner.query(
      `UPDATE \`clarisa_projects\` SET \`phase\` = 2025 WHERE \`phase\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`external_source\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`external_project_id\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`external_code\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`source_center_acronym\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`source_center_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` ADD \`source_status\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_clarisa_projects_source_center_acronym\` ON \`clarisa_projects\` (\`source_center_acronym\`)`,
    );

    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` ADD \`allocation_percentage\` decimal(5,2) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` ADD \`program_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` ADD \`program_short_name\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` DROP COLUMN \`program_short_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` DROP COLUMN \`program_name\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` DROP COLUMN \`allocation_percentage\``,
    );

    await queryRunner.query(
      `DROP INDEX \`IDX_clarisa_projects_source_center_acronym\` ON \`clarisa_projects\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`source_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`source_center_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`source_center_acronym\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`external_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`external_project_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`external_source\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_projects\` DROP COLUMN \`phase\``,
    );
  }
}
