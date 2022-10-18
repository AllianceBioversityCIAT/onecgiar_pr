import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropResultByInstitutionsType1665517158239
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`results_by_institution_type\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
