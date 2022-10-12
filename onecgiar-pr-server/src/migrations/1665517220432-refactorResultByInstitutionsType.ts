import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorResultByInstitutionsType1665517220432
  implements MigrationInterface
{
  name = 'refactorResultByInstitutionsType1665517220432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`results_by_institution_type\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`institution_types_id\` bigint NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`creation_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NOT NULL, \`institution_roles_id\` bigint NOT NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_bc9eaf20321b224ec6d011854bc\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_1f9eeeee19cfa4711445d4885d1\` FOREIGN KEY (\`institution_roles_id\`) REFERENCES \`institution_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_55bca184237100f0ef8cc8fb0ea\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5feeeaa251795ec834bc6d8a72d\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5ecc67bc0d3fdc650138d509d27\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5ecc67bc0d3fdc650138d509d27\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5feeeaa251795ec834bc6d8a72d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_55bca184237100f0ef8cc8fb0ea\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_1f9eeeee19cfa4711445d4885d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_bc9eaf20321b224ec6d011854bc\``,
    );
    await queryRunner.query(`DROP TABLE \`results_by_institution_type\``);
  }
}
