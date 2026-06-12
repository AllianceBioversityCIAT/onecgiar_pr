import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultDeletionAuditTable1774000000000
  implements MigrationInterface
{
  name = 'CreateResultDeletionAuditTable1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_deletion_audit\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`deleted_by_user_id\` int NOT NULL,
        \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`last_updated_date\` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        \`justification\` text NULL,
        \`deletion_source\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_result_deletion_audit_result_id\` (\`result_id\`),
        INDEX \`IDX_result_deletion_audit_created_date\` (\`created_date\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_deletion_audit\` ADD CONSTRAINT \`FK_rda_result_id\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_deletion_audit\` ADD CONSTRAINT \`FK_rda_deleted_by_user\` FOREIGN KEY (\`deleted_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_deletion_audit\` DROP FOREIGN KEY \`FK_rda_deleted_by_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_deletion_audit\` DROP FOREIGN KEY \`FK_rda_result_id\``,
    );
    await queryRunner.query(`DROP TABLE \`result_deletion_audit\``);
  }
}
