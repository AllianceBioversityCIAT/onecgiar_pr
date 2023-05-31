import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedOtherItemIntoExpertsControlList1684513505461
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT into expertises (name) values ('Expert on the core innovation');`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
