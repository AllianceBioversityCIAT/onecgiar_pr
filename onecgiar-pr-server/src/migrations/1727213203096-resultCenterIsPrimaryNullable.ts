import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResultCenterIsPrimaryNullable1727213203096
  implements MigrationInterface
{
  name = 'ResultCenterIsPrimaryNullable1727213203096';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` CHANGE \`is_primary\` \`is_primary\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` CHANGE \`is_primary\` \`is_primary\` tinyint NOT NULL`,
    );
  }
}
