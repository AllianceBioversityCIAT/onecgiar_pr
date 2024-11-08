import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInnovationUseEvidence1730902695251
  implements MigrationInterface
{
  name = 'AddInnovationUseEvidence1730902695251';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`innovation_use_related\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`innovation_use_related\``,
    );
  }
}
