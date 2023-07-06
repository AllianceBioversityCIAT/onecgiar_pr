import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedStatusIdIntoResult1688590588768
  implements MigrationInterface
{
  name = 'addedStatusIdIntoResult1688590588768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`status_id\` bigint NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD CONSTRAINT \`FK_38f9afa6d2d82dd11f7ee6a5cf8\` FOREIGN KEY (\`status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `update \`result\` set status_id = if(status = 1, 3, 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_38f9afa6d2d82dd11f7ee6a5cf8\``,
    );
    await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`status_id\``);
  }
}
