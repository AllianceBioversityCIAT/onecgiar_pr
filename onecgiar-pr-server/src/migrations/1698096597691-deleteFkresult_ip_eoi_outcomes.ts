import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteFkresultIpEoiOutcomes1698096597691
  implements MigrationInterface
{
  name = 'DeleteFkresultIpEoiOutcomes1698096597691';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` DROP FOREIGN KEY \`FK_526f3ea7b85362c4903ab598de5\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` ADD CONSTRAINT \`FK_526f3ea7b85362c4903ab598de5\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
