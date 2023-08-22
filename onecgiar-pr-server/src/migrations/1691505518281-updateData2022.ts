import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateData20221691505518281 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update \`result\` 
        set status_id = 2
        where status_id = 3
            and version_id = 1
            and is_active > 0;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
