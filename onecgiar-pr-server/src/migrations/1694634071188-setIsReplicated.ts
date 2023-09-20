import { MigrationInterface, QueryRunner } from 'typeorm';

export class setIsReplicated1694634071188 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update \`result\` r3
            inner join (select r.id, r.result_code , r.version_id, if(v.id = (select min(v2.id) from \`result\` r2 inner join \`version\` v2 on v2.id = r2.version_id  where r2.result_code = r.result_code and v2.app_module_id = v.app_module_id), false, true) as is_replicated 
            from \`result\` r
            inner join \`version\` v on v.id = r.version_id
            where r.is_active > 0) p on p.id = r3.id 
            set r3.is_replicated = p.is_replicated;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
