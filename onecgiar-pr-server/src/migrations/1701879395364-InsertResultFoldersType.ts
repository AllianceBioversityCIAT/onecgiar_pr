import { MigrationInterface, QueryRunner } from 'typeorm';
import { getUserSupportId } from '../shared/utils/prms-user-support.util';
import { env } from 'process';

export class InsertResultFoldersType1701879395364
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(
      `INSERT INTO result_folders_type (name, created_by) VALUES ('Type one report', ${getUserSupportId(
        env.SUPPORT_USER,
      )})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(
      `DELETE FROM result_folders_type WHERE name = 'Type one report'`,
    );
  }
}
