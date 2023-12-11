import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResultFoldersEntities1701876400485 implements MigrationInterface {
  name = 'ResultFoldersEntities1701876400485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_folders_type\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`justification\` text NULL, \`result_folders_type_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`result_folders_type_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_folders\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`justification\` text NULL, \`result_folders_id\` bigint NOT NULL AUTO_INCREMENT, \`folder_link\` text NOT NULL, \`folder_type_id\` bigint NOT NULL, \`phase_id\` bigint NOT NULL, PRIMARY KEY (\`result_folders_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_folders\` ADD CONSTRAINT \`FK_c3040120ab53e64833640fd97ea\` FOREIGN KEY (\`phase_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_folders\` ADD CONSTRAINT \`FK_81202cf176c587e5bbf67470ac1\` FOREIGN KEY (\`folder_type_id\`) REFERENCES \`result_folders_type\`(\`result_folders_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_folders\` DROP FOREIGN KEY \`FK_81202cf176c587e5bbf67470ac1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_folders\` DROP FOREIGN KEY \`FK_c3040120ab53e64833640fd97ea\``,
    );
    await queryRunner.query(`DROP TABLE \`result_folders\``);
    await queryRunner.query(`DROP TABLE \`result_folders_type\``);
  }
}

