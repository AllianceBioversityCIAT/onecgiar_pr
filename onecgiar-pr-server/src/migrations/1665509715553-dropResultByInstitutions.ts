import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropResultByInstitutions1665509715553
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`results_by_institution\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
