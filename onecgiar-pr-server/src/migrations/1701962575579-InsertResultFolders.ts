import { MigrationInterface, QueryRunner } from 'typeorm';
import { getUserSupportId } from '../shared/utils/prms-user-support.util';
import { env } from 'process';
import { EnvironmentExtractor } from '../shared/utils/environment-extractor';

export class InsertResultFolders1701962575579 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (EnvironmentExtractor.isProduction()) {
      await queryRunner.query(`insert into result_folders (folder_link, phase_id, folder_type_id, created_by) 
        values ('https://cgiar.sharepoint.com/:f:/s/PRMSProject/EuPp7t1onn1JtAAT2q_xjJEB0N5JmBOkIZsWArFxvxQnJw?e=EpEwMd', 1, 1, ${getUserSupportId(
          env.SUPPORT_USER,
        )}),
        ('https://cgiar.sharepoint.com/:f:/s/PRMSProject/EpkSgnXk82tNj6Na_fdD2vEBr-cjBe8_DpcUYwgdsxNXGw?e=ZeBgcY', 3, 1, ${getUserSupportId(
          env.SUPPORT_USER,
        )})
        ;`);
    } else {
      await queryRunner.query(`insert into result_folders (folder_link, phase_id, folder_type_id, created_by) 
        values ('https://cgiar.sharepoint.com/:f:/s/PRMSProject/EuPp7t1onn1JtAAT2q_xjJEB0N5JmBOkIZsWArFxvxQnJw?e=caKuqa', 1, 1, ${getUserSupportId(
          env.SUPPORT_USER,
        )}),
        ('https://cgiar.sharepoint.com/:f:/s/PRMSProject/EpkSgnXk82tNj6Na_fdD2vEBr-cjBe8_DpcUYwgdsxNXGw?e=ZeBgcY', 18, 1, ${getUserSupportId(
          env.SUPPORT_USER,
        )})
        ;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`delete from result_folders;`);
  }
}
