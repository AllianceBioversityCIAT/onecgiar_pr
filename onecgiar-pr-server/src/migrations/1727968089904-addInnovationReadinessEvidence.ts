import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInnovationReadinessEvidence1727968089904
  implements MigrationInterface
{
  name = 'AddInnovationReadinessEvidence1727968089904';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`innovation_readiness_related\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`innovation_readiness_related\``,
    );
  }
}
