import { MigrationInterface, QueryRunner } from 'typeorm';

export class addingCgCountryMappingTable1676062342734
  implements MigrationInterface
{
  name = 'addingCgCountryMappingTable1676062342734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`cgspace_country_mappings\` (\`cgspace_country_mapping_id\` bigint NOT NULL AUTO_INCREMENT, \`cgspace_country_name\` text NOT NULL, \`clarisa_country_code\` int NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`cgspace_country_mapping_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` ADD CONSTRAINT \`FK_22b8ef53aacfd1d2a910928c923\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` ADD CONSTRAINT \`FK_1c25d937d1bd36dbe5557cf6f5a\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` ADD CONSTRAINT \`FK_076ba67dd47e0c11b2beeb77b93\` FOREIGN KEY (\`clarisa_country_code\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` DROP FOREIGN KEY \`FK_076ba67dd47e0c11b2beeb77b93\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` DROP FOREIGN KEY \`FK_1c25d937d1bd36dbe5557cf6f5a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`cgspace_country_mappings\` DROP FOREIGN KEY \`FK_22b8ef53aacfd1d2a910928c923\``,
    );
    await queryRunner.query(`DROP TABLE \`cgspace_country_mappings\``);
  }
}
