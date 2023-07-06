import { MigrationInterface, QueryRunner } from 'typeorm';

export class activePhase1687295058661 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update \`version\` set status = 1 where id = 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
