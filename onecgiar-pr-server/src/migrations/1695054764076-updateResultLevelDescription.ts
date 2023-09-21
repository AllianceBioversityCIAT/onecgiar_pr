import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateResultLevelDescription1695054764076
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update \`result_level\` set description = 'A change in knowledge, attitudes, skills, and/or relationships (KASR), which manifests as a change in behavior within the spheres of influence and interest, that results in whole or in part from the research and its outputs.' where id in (2, 3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
