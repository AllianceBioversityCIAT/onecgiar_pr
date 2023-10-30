import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeTableType1698699788046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update prms_tables_types ptt
        set ptt.table_type = 'Intenal control list'
        where ptt.table_name in ('result_status','result_by_level');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update prms_tables_types ptt
        set ptt.table_type = 'Transactional'
        where ptt.table_name in ('result_status','result_by_level');`);
  }
}

