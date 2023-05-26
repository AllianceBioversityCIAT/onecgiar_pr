import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorAssessedDuringExpertWorkshop1685138922752
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update assessed_during_expert_workshop 
        set name  = 'Current and Potential innovation readiness and innovation use were self-assessed by workshop experts' 
        where id = 2`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
