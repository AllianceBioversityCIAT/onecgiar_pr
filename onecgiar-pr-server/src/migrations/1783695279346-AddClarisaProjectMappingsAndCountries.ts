import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClarisaProjectMappingsAndCountries1783695279346
  implements MigrationInterface
{
  name = 'AddClarisaProjectMappingsAndCountries1783695279346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_project_countries\` (\`id\` bigint NOT NULL, \`project_id\` bigint NOT NULL, \`country_id\` int NOT NULL, \`country_code\` bigint NULL, INDEX \`IDX_clarisa_project_countries_project_id\` (\`project_id\`), INDEX \`IDX_clarisa_project_countries_country_id\` (\`country_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_project_mappings\` (\`id\` bigint NOT NULL, \`project_id\` bigint NOT NULL, \`program_id\` bigint NOT NULL, \`allocation\` decimal(5,2) NULL, \`complementarity\` varchar(50) NULL, \`efficiencies\` varchar(50) NULL, \`comments\` text NULL, \`status\` varchar(50) NULL, INDEX \`IDX_clarisa_project_mappings_project_id\` (\`project_id\`), INDEX \`IDX_clarisa_project_mappings_program_id\` (\`program_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` ADD CONSTRAINT \`FK_clarisa_project_countries_project_id\` FOREIGN KEY (\`project_id\`) REFERENCES \`clarisa_projects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` ADD CONSTRAINT \`FK_clarisa_project_countries_country_id\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` ADD CONSTRAINT \`FK_clarisa_project_mappings_project_id\` FOREIGN KEY (\`project_id\`) REFERENCES \`clarisa_projects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_mappings\` DROP FOREIGN KEY \`FK_clarisa_project_mappings_project_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` DROP FOREIGN KEY \`FK_clarisa_project_countries_country_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_project_countries\` DROP FOREIGN KEY \`FK_clarisa_project_countries_project_id\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_project_mappings\``);
    await queryRunner.query(`DROP TABLE \`clarisa_project_countries\``);
  }
}
