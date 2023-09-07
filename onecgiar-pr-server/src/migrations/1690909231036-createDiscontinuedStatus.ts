import { MigrationInterface, QueryRunner } from 'typeorm';

export class createDiscontinuedStatus1690909231036
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `insert into result_status (status_name) values('Discontinued')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
