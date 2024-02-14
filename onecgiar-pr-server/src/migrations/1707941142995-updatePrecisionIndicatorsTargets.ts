import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePrecisionIndicatorsTargets1707941142995
  implements MigrationInterface
{
  name = 'UpdatePrecisionIndicatorsTargets1707941142995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_indicators_targets\` CHANGE \`contributing_indicator\` \`contributing_indicator\` decimal(9,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_indicators_targets\` CHANGE \`contributing_indicator\` \`contributing_indicator\` decimal(6,2) NULL`,
    );
  }
}
