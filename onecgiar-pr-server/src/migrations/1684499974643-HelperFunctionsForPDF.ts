import { MigrationInterface, QueryRunner } from 'typeorm';

export class HelperFunctionsForPDF1684499974643 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`cleanNullFromJsonArray\`;`,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`cleanNullFromJsonArray\`(json_arr json) RETURNS json
        begin
            declare resulting_arr json default json_array();
            declare pos bigint default 0;
            
            while pos < json_length(json_arr) do
                if(json_type(json_extract(json_arr, concat('$[',pos,']'))) <> 'NULL') then
                    set resulting_arr = json_array_insert(resulting_arr, concat('$[',json_length(resulting_arr),']'),json_extract(json_arr, concat('$[',pos,']')));
                end if;
                set pos = pos + 1;
            end while;
            
            return resulting_arr;
        end;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`cleanNullFromJsonArray\`;`,
    );
  }
}
