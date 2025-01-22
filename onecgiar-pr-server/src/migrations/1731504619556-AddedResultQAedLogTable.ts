import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedResultQAedLogTable1731504619556
  implements MigrationInterface
{
  name = 'AddedResultQAedLogTable1731504619556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_qaed_log\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`qaed_date\` date NOT NULL, \`qaed_comments\` text NULL, \`qaed_user\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_qaed_log\` ADD CONSTRAINT \`FK_9935d4ce4da5bb7b26cee090987\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_qaed_log\` ADD CONSTRAINT \`FK_bee9006e35c169af6033da52a04\` FOREIGN KEY (\`qaed_user\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_qaed_log\` DROP FOREIGN KEY \`FK_bee9006e35c169af6033da52a04\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_qaed_log\` DROP FOREIGN KEY \`FK_9935d4ce4da5bb7b26cee090987\``,
    );
    await queryRunner.query(`DROP TABLE \`result_qaed_log\``);
  }
}
