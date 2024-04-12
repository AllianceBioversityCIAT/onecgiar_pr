import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOptionDiscontinuedList1712263256926 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            investment_discontinued_option
        SET
            \`option\` = "The innovation package lead and/or team took up new responsibilities."
        WHERE
            investment_discontinued_option_id = 8;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            investment_discontinued_option
        SET
            \`option\` = "The innovation lead and/or team took up new responsibilities."
        WHERE
            investment_discontinued_option_id = 8;
        `);
    }

}
