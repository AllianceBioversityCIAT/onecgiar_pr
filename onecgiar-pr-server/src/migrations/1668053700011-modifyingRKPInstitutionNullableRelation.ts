import { MigrationInterface, QueryRunner } from 'typeorm';

export class modifyingRKPInstitutionNullableRelation1668053700011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`results_by_institutions_id\` \`results_by_institutions_id\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` CHANGE \`results_by_institutions_id\` \`results_by_institutions_id\` bigint NOT NULL`,
    );
  }
}
