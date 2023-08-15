import { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteFkTocResult1690293809630 implements MigrationInterface {
  name = 'deleteFkTocResult1690293809630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_816352d727b97f80189ebbdfec4\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_816352d727b97f80189ebbdfec4\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
