import { MigrationInterface, QueryRunner } from 'typeorm';

export class resultByInitiativeRefactor1664894495125
  implements MigrationInterface
{
  name = 'resultByInitiativeRefactor1664894495125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS\`results_by_inititiative\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
