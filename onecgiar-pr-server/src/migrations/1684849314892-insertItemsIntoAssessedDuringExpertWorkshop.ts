import { MigrationInterface, QueryRunner } from 'typeorm';

export class insertItemsIntoAssessedDuringExpertWorkshop1684849314892
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT into \`assessed_during_expert_workshop\` (name) 
                                values ('Only Current innovation readiness and innovation use were self-assessed by the workshop experts'),
                                       ('Text BoxCurrent and Potential innovation readiness and innovation use were self-assessed by workshop experts'),
                                       ('None of the above');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
