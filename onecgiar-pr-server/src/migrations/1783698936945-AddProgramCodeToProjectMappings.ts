import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgramCodeToProjectMappings1783698936945
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` ADD \`program_code\` varchar(100) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` DROP COLUMN \`program_code\``,
    );
  }
}
