import { MigrationInterface, QueryRunner } from 'typeorm';

export class updaePhases1688501564250 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update \`version\` 
        set phase_name = 'Reporting 2022',
        status = 0,
        cgspace_year = 2022,
        phase_year = 2022,
        app_module_id = 1
        where id = 1`);

    await queryRunner.query(`insert into \`version\`
        (
            phase_name,
            status,
            cgspace_year,
            phase_year,
            app_module_id,
            is_active
        ) values
        (
            'IPSR 2023',
            1,
            2023,
            2023,
            2,
            1
        )`);

    await queryRunner.query(`
    update \`result\` 
        set version_id = (select v.id from \`version\` v where v.is_active > 0 and v.status > 0 and v.app_module_id = 2 limit 1) 
    where result_type_id in (10, 11)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
